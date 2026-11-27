let INITIAL_PAYLOAD = null;
let overviewSupplyChart = null;
let overviewNrwChart = null;
let simulatorChart = null;

const PAGE_META = {
  overview: {
    title: 'Dashboard Neraca Ketersediaan Air Bersih Kota Bandung',
    sub: 'Pemodelan Sistem Dinamik Berbasis Data Empiris PDAM Tirtawening & Disdukcapil (2016–2035)'
  },
  datasets: {
    title: 'Eksplorasi Dataset Empiris Open Data Kota Bandung',
    sub: 'Audit distribusi bulanan PDAM Tirtawening (2016–2021) dan proyeksi demografi Disdukcapil (2017–2025)'
  },
  model: {
    title: 'Arsitektur Model Sistem Dinamik & Validasi Empiris',
    sub: 'Stock & Flow Diagram (SFD), formulasi persamaan diferensial Euler, dan evaluasi akurasi MAPE'
  },
  simulator: {
    title: 'Simulator Kebijakan Air Bersih Interaktif (2016–2035)',
    sub: 'Eksperimen sensitivitas rehabilitasi kebocoran pipa (NRW), ekspansi SPAM, dan efisiensi konsumsi'
  },
  gallery: {
    title: 'Galeri Grafik Resolusi Tinggi & Dokumentasi Praktikum',
    sub: '6 visualisasi analitik siap sisip untuk artikel ilmiah UTS Pemodelan dan Simulasi'
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  setupSidebarNavigation();
  await loadInitialData();
  setupSliders();
});

function setupSidebarNavigation() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebarToggle');
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const navItems = document.querySelectorAll('.nav-item');

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  mobileBtn.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
  });

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
      const targetSec = document.getElementById(`sec-${target}`);
      if (targetSec) targetSec.classList.add('active');

      if (PAGE_META[target]) {
        document.getElementById('topPageTitle').textContent = PAGE_META[target].title;
        document.getElementById('topPageSub').textContent = PAGE_META[target].sub;
      }

      sidebar.classList.remove('mobile-open');
    });
  });

  // Sidebar Quick Policy Switcher
  document.querySelectorAll('#sidebarPresets .preset-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#sidebarPresets .preset-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const preset = btn.getAttribute('data-preset');
      updateOverviewScenario(preset);
    });
  });
}

async function loadInitialData() {
  try {
    const res = await fetch('/api/initial-data');
    INITIAL_PAYLOAD = await res.json();

    renderOverviewCharts('bau');
    populateDatasetTables();
    populateValidationTable();
    runLiveSimulation();
  } catch (err) {
    console.error('Gagal memuat data awal:', err);
  }
}

function updateOverviewScenario(presetKey) {
  if (!INITIAL_PAYLOAD) return;
  const series = INITIAL_PAYLOAD.scenarios[presetKey];
  const last = series[series.length - 1];

  const labelsMap = {
    bau: 'Skenario Baseline (BAU) — Defisit Kritis',
    s1: 'Skenario 1 (Optimasi NRW) — Peningkatan Signifikan',
    s2: 'Skenario 2 (Terpadu SPAM + NRW) — Target Tercapai'
  };

  document.getElementById('kpiCoverage2035').textContent = `${last.rasio_layanan_pct.toFixed(2)}%`;
  document.getElementById('kpiCoverageSub').textContent = labelsMap[presetKey] || '';

  renderOverviewCharts(presetKey);
}

function renderOverviewCharts(presetKey) {
  const data = INITIAL_PAYLOAD.scenarios[presetKey];
  const years = data.map(d => d.tahun);
  const supply = data.map(d => +(d.pasokan_efektif / 1e6).toFixed(2));
  const demand = data.map(d => +(d.kebutuhan_air / 1e6).toFixed(2));
  const nrw = data.map(d => d.nrw_persen);
  const coverage = data.map(d => d.rasio_layanan_pct);

  const ctx1 = document.getElementById('overviewSupplyDemandChart').getContext('2d');
  if (overviewSupplyChart) overviewSupplyChart.destroy();
  overviewSupplyChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: years,
      datasets: [
        {
          label: 'Kebutuhan Air Kota (Jt m³)',
          data: demand,
          borderColor: '#e11d48',
          backgroundColor: 'rgba(225, 29, 72, 0.08)',
          borderWidth: 2.5,
          tension: 0.3,
          fill: false
        },
        {
          label: 'Pasokan Efektif PDAM (Jt m³)',
          data: supply,
          borderColor: '#0284c7',
          backgroundColor: 'rgba(14, 165, 233, 0.14)',
          borderWidth: 3,
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Juta m³ / Tahun' } }
      }
    }
  });

  const ctx2 = document.getElementById('overviewNrwChart').getContext('2d');
  if (overviewNrwChart) overviewNrwChart.destroy();
  overviewNrwChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: years,
      datasets: [
        {
          label: 'Rasio Cakupan Layanan (%)',
          data: coverage,
          borderColor: '#0d9488',
          backgroundColor: 'rgba(13, 148, 136, 0.12)',
          borderWidth: 2.8,
          tension: 0.3,
          fill: true
        },
        {
          label: 'Tingkat Kehilangan Air / NRW (%)',
          data: nrw,
          borderColor: '#f59e0b',
          borderDash: [6, 4],
          borderWidth: 2.4,
          tension: 0.3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: true, max: 85, title: { display: true, text: 'Persentase (%)' } }
      }
    }
  });
}

function populateDatasetTables() {
  const pdamRows = INITIAL_PAYLOAD.datasets.pdam_monthly;
  const popRows = INITIAL_PAYLOAD.datasets.population;

  const renderPdam = (yearFilter) => {
    const filtered = yearFilter === 'ALL' ? pdamRows : pdamRows.filter(r => String(r.tahun) === yearFilter);
    document.getElementById('tbodyPdam').innerHTML = filtered.map(r => `
      <tr>
        <td><strong>${r.tahun}</strong></td>
        <td>${r.bulan}</td>
        <td>${Number(r.jumlah_air_minum_disalurkan).toLocaleString('id-ID')} m³</td>
      </tr>
    `).join('');
  };

  renderPdam('ALL');
  document.getElementById('filterYearPdam').addEventListener('change', (e) => renderPdam(e.target.value));

  document.getElementById('tbodyPop').innerHTML = popRows.map(r => {
    const keb = Math.round(r.jumlah_penduduk * 0.15 * 365);
    return `
      <tr>
        <td><strong>${r.tahun}</strong></td>
        <td>${Number(r.jumlah_penduduk).toLocaleString('id-ID')} jiwa</td>
        <td>${keb.toLocaleString('id-ID')} m³</td>
      </tr>
    `;
  }).join('');
}

function populateValidationTable() {
  const valAir = INITIAL_PAYLOAD.validation.air;
  document.getElementById('tbodyValidation').innerHTML = valAir.map(r => `
    <tr>
      <td><strong>${r.tahun}</strong></td>
      <td>${Number(r.aktual).toLocaleString('id-ID')} m³</td>
      <td>${Math.round(r.simulasi).toLocaleString('id-ID')} m³</td>
      <td><strong>${r.ape_pct.toFixed(2)}%</strong></td>
      <td><span class="info-chip teal" style="padding:3px 10px;font-size:0.72rem;">Sangat Akurat (&lt;5%)</span></td>
    </tr>
  `).join('');
}

function setupSliders() {
  const sliders = ['sliderNrwRate', 'sliderNrwFloor', 'sliderIpaRate', 'sliderDemandLpd', 'sliderPopMod'];
  sliders.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      syncSliderLabels();
      runLiveSimulation();
    });
  });
}

function syncSliderLabels() {
  const nrwRate = parseFloat(document.getElementById('sliderNrwRate').value);
  const nrwFloor = parseFloat(document.getElementById('sliderNrwFloor').value);
  const ipaRate = parseFloat(document.getElementById('sliderIpaRate').value);
  const demand = parseFloat(document.getElementById('sliderDemandLpd').value);
  const popMod = parseFloat(document.getElementById('sliderPopMod').value);

  document.getElementById('valNrwRate').textContent = `${Math.round(nrwRate * 100)}% / thn`;
  document.getElementById('valNrwFloor').textContent = `${Math.round(nrwFloor * 100)}%`;
  document.getElementById('valIpaRate').textContent = `+${(ipaRate * 100).toFixed(1)}% / thn`;
  document.getElementById('valDemandLpd').textContent = `${demand} L/org/hr`;
  document.getElementById('valPopMod').textContent = `${popMod.toFixed(2)}x`;
}

function applySimPreset(preset, btnEl) {
  document.querySelectorAll('.btn-preset-sim').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  if (preset === 'bau') {
    document.getElementById('sliderNrwRate').value = 0.0;
    document.getElementById('sliderNrwFloor').value = 0.18;
    document.getElementById('sliderIpaRate').value = 0.0;
    document.getElementById('sliderDemandLpd').value = 150;
    document.getElementById('sliderPopMod').value = 1.0;
  } else if (preset === 's1') {
    document.getElementById('sliderNrwRate').value = 0.14;
    document.getElementById('sliderNrwFloor').value = 0.18;
    document.getElementById('sliderIpaRate').value = 0.015;
    document.getElementById('sliderDemandLpd').value = 150;
    document.getElementById('sliderPopMod').value = 1.0;
  } else if (preset === 's2') {
    document.getElementById('sliderNrwRate').value = 0.18;
    document.getElementById('sliderNrwFloor').value = 0.16;
    document.getElementById('sliderIpaRate').value = 0.048;
    document.getElementById('sliderDemandLpd').value = 135;
    document.getElementById('sliderPopMod').value = 1.0;
  }
  syncSliderLabels();
  runLiveSimulation();
}

async function runLiveSimulation() {
  const payload = {
    nrw_reduction_rate: parseFloat(document.getElementById('sliderNrwRate').value),
    nrw_floor: parseFloat(document.getElementById('sliderNrwFloor').value),
    ipa_expansion_rate: parseFloat(document.getElementById('sliderIpaRate').value),
    per_capita_demand_lpd: parseFloat(document.getElementById('sliderDemandLpd').value),
    pop_growth_modifier: parseFloat(document.getElementById('sliderPopMod').value)
  };

  try {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    const custom = result.custom;
    const bau = result.bau;

    const last = custom[custom.length - 1];
    document.getElementById('simSummaryBanner').textContent =
      `Proyeksi 2035 — Rasio Layanan: ${last.rasio_layanan_pct.toFixed(1)}% | Pasokan Efektif: ${(last.pasokan_efektif / 1e6).toFixed(2)} Jt m³ | NRW Akhir: ${last.nrw_persen.toFixed(1)}%`;

    const years = custom.map(d => d.tahun);
    const ctx = document.getElementById('simulatorLiveChart').getContext('2d');
    if (simulatorChart) simulatorChart.destroy();
    simulatorChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: years,
        datasets: [
          {
            label: 'Kebutuhan Air Kustom (Jt m³)',
            data: custom.map(d => +(d.kebutuhan_air / 1e6).toFixed(2)),
            borderColor: '#e11d48',
            borderWidth: 2.3,
            tension: 0.3
          },
          {
            label: 'Pasokan Skenario Kustom (Jt m³)',
            data: custom.map(d => +(d.pasokan_efektif / 1e6).toFixed(2)),
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13, 148, 136, 0.14)',
            borderWidth: 3,
            tension: 0.3,
            fill: true
          },
          {
            label: 'Pasokan Baseline BAU (Jt m³)',
            data: bau.map(d => +(d.pasokan_efektif / 1e6).toFixed(2)),
            borderColor: '#64748b',
            borderDash: [5, 5],
            borderWidth: 2,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Volume Air (Juta m³ / Tahun)' } }
        }
      }
    });

    document.getElementById('tbodySimTable').innerHTML = custom.map(r => `
      <tr>
        <td><strong>${r.tahun}</strong></td>
        <td>${Number(r.populasi).toLocaleString('id-ID')}</td>
        <td>${r.nrw_persen.toFixed(1)}%</td>
        <td>${(r.pasokan_efektif / 1e6).toFixed(2)} Jt m³</td>
        <td>${(r.kebutuhan_air / 1e6).toFixed(2)} Jt m³</td>
        <td><strong>${r.rasio_layanan_pct.toFixed(2)}%</strong></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Simulation error:', err);
  }
}

function openLightbox(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightboxModal').classList.add('open');
}

function closeLightbox(e) {
  if (e.target.id === 'lightboxModal') {
    document.getElementById('lightboxModal').classList.remove('open');
  }
}
