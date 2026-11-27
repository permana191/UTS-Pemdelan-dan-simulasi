import os
import numpy as np
import pandas as pd
from flask import Flask, render_template, request, jsonify, send_from_directory

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
IMG_DIR = os.path.join(BASE_DIR, 'static', 'images')

df_air_raw = pd.read_csv(os.path.join(DATA_DIR, 'pdam_tirtawening_bandung.csv'))
df_pop_raw = pd.read_csv(os.path.join(DATA_DIR, 'penduduk_kota_bandung.csv')).sort_values('tahun').reset_index(drop=True)

BULAN_MAP = {
    'JANUARI': 1, 'FEBRUARI': 2, 'MARET': 3, 'APRIL': 4,
    'MEI': 5, 'JUNI': 6, 'JULI': 7, 'AGUSTUS': 8,
    'SEPTEMBER': 9, 'OKTOBER': 10, 'NOVEMBER': 11, 'DESEMBER': 12
}
df_air_raw['bulan_num'] = df_air_raw['bulan'].map(BULAN_MAP)
df_air_sorted = df_air_raw.sort_values(['tahun', 'bulan_num']).reset_index(drop=True)
air_yearly = df_air_sorted.groupby('tahun')['jumlah_air_minum_disalurkan'].sum().reset_index()

CAGR_POP = (
    df_pop_raw.loc[df_pop_raw['tahun'] == 2025, 'jumlah_penduduk'].values[0]
    / df_pop_raw.loc[df_pop_raw['tahun'] == 2017, 'jumlah_penduduk'].values[0]
) ** (1 / 8) - 1
P_2017 = float(df_pop_raw.loc[df_pop_raw['tahun'] == 2017, 'jumlah_penduduk'].values[0])
P_2016_EST = P_2017 / (1.0 + CAGR_POP)
K_POP = 3250000.0
R_POP = CAGR_POP / (1.0 - (df_pop_raw['jumlah_penduduk'].mean() / K_POP))


def run_sd_simulation(
    start_year=2016,
    end_year=2035,
    dt=0.25,
    nrw_target_reduction_rate=0.0,
    nrw_floor=0.18,
    ipa_expansion_rate=0.0,
    per_capita_demand_lpd=150.0,
    pop_growth_modifier=1.0
):
    steps = int((end_year - start_year) / dt) + 1
    times = np.linspace(start_year, end_year, steps)

    P = P_2016_EST
    C_ipa = 63500000.0
    NRW = 0.3285
    Cum_Deficit = 0.0

    nrw_aging_rate = 0.25
    nrw_max_bau = 0.435

    records = []
    for t in times:
        q_dist = C_ipa * (1.0 - NRW)
        q_loss = C_ipa * NRW
        q_demand = P * (per_capita_demand_lpd / 1000.0) * 365.0
        neraca = q_dist - q_demand
        rasio_layanan = (q_dist / q_demand) * 100.0
        tekanan_air_tanah = max(0.0, -neraca)

        if abs(t - round(t)) < 1e-6:
            records.append({
                'tahun': int(round(t)),
                'populasi': int(round(P)),
                'kapasitas_ipa': round(C_ipa, 2),
                'nrw_persen': round(NRW * 100.0, 2),
                'pasokan_efektif': round(q_dist, 2),
                'kehilangan_air': round(q_loss, 2),
                'kebutuhan_air': round(q_demand, 2),
                'neraca_air': round(neraca, 2),
                'rasio_layanan_pct': round(rasio_layanan, 2),
                'eksploitasi_air_tanah': round(tekanan_air_tanah, 2),
                'akumulasi_defisit': round(Cum_Deficit, 2)
            })

        dP_dt = (R_POP * pop_growth_modifier) * P * (1.0 - P / K_POP)
        policy_active = 1.0 if t >= 2022.0 else 0.0
        dC_dt = C_ipa * (ipa_expansion_rate * policy_active)

        if policy_active > 0 and nrw_target_reduction_rate > 0:
            dNRW_dt = -nrw_target_reduction_rate * (NRW - nrw_floor)
        else:
            dNRW_dt = nrw_aging_rate * (nrw_max_bau - NRW)

        dDef_dt = tekanan_air_tanah

        P = P + dP_dt * dt
        C_ipa = C_ipa + dC_dt * dt
        NRW = float(np.clip(NRW + dNRW_dt * dt, 0.10, 0.55))
        Cum_Deficit = Cum_Deficit + dDef_dt * dt

    return records


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/initial-data')
def initial_data():
    bau = run_sd_simulation(nrw_target_reduction_rate=0.0, nrw_floor=0.18, ipa_expansion_rate=0.0, per_capita_demand_lpd=150.0)
    s1 = run_sd_simulation(nrw_target_reduction_rate=0.14, nrw_floor=0.18, ipa_expansion_rate=0.015, per_capita_demand_lpd=150.0)
    s2 = run_sd_simulation(nrw_target_reduction_rate=0.18, nrw_floor=0.16, ipa_expansion_rate=0.048, per_capita_demand_lpd=135.0)

    bau_map = {r['tahun']: r for r in bau}
    val_air = []
    for _, row in air_yearly.iterrows():
        yr = int(row['tahun'])
        act = float(row['jumlah_air_minum_disalurkan'])
        sim = bau_map[yr]['pasokan_efektif']
        ape = abs((act - sim) / act) * 100.0
        val_air.append({
            'tahun': yr,
            'aktual': act,
            'simulasi': sim,
            'ape_pct': round(ape, 2)
        })

    val_pop = []
    for _, row in df_pop_raw.iterrows():
        yr = int(row['tahun'])
        act = int(row['jumlah_penduduk'])
        sim = bau_map[yr]['populasi']
        ape = abs((act - sim) / act) * 100.0
        val_pop.append({
            'tahun': yr,
            'aktual': act,
            'simulasi': sim,
            'ape_pct': round(ape, 2)
        })

    mape_air = round(float(np.mean([x['ape_pct'] for x in val_air])), 2)
    mape_pop = round(float(np.mean([x['ape_pct'] for x in val_pop])), 2)

    monthly_records = df_air_sorted[['tahun', 'bulan', 'jumlah_air_minum_disalurkan']].to_dict(orient='records')
    pop_records = df_pop_raw[['tahun', 'jumlah_penduduk']].to_dict(orient='records')

    return jsonify({
        'scenarios': {'bau': bau, 's1': s1, 's2': s2},
        'validation': {'air': val_air, 'pop': val_pop, 'mape_air': mape_air, 'mape_pop': mape_pop},
        'datasets': {
            'pdam_monthly': monthly_records,
            'pdam_yearly': air_yearly.to_dict(orient='records'),
            'population': pop_records
        }
    })


@app.route('/api/simulate', methods=['POST'])
def simulate():
    payload = request.get_json(silent=True) or {}
    nrw_rate = float(payload.get('nrw_reduction_rate', 0.14))
    nrw_floor = float(payload.get('nrw_floor', 0.18))
    ipa_rate = float(payload.get('ipa_expansion_rate', 0.015))
    demand_lpd = float(payload.get('per_capita_demand_lpd', 150.0))
    pop_mod = float(payload.get('pop_growth_modifier', 1.0))

    custom_res = run_sd_simulation(
        nrw_target_reduction_rate=nrw_rate,
        nrw_floor=nrw_floor,
        ipa_expansion_rate=ipa_rate,
        per_capita_demand_lpd=demand_lpd,
        pop_growth_modifier=pop_mod
    )
    bau_res = run_sd_simulation(
        nrw_target_reduction_rate=0.0,
        nrw_floor=0.18,
        ipa_expansion_rate=0.0,
        per_capita_demand_lpd=150.0,
        pop_growth_modifier=1.0
    )
    return jsonify({'custom': custom_res, 'bau': bau_res})


@app.route('/download/chart/<filename>')
def download_chart(filename):
    safe_files = {
        'fig1_eda_pasokan.png',
        'fig2_eda_penduduk_neraca.png',
        'fig3_cld_sfd_diagram.png',
        'fig4_validasi_model.png',
        'fig5_simulasi_skenario.png',
        'fig6_analisis_sensitivitas.png'
    }
    if filename not in safe_files:
        return "File not found", 404
    return send_from_directory(IMG_DIR, filename, as_attachment=True)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
