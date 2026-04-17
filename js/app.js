let dataGlobal = [];

// ===== PAGINATION =====
let currentPage = 1;
const rowsPerPage = 10;
let currentData = [];

// ===== MAP =====
const map = L.map('map').setView([-2.5,120],5);

// BASEMAP
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 10
}).addTo(map);

// ===== LOAD DATA =====
fetch('data/data.json')
.then(res => res.json())
.then(data => {
  dataGlobal = data;
  initFilter();
  loadMap();
});

// ===== NORMALISASI =====
function normalizeProv(str){
  return str.toLowerCase().replace(/\s/g,'').trim();
}

// ===== FILTER =====
function initFilter(){
  const prov = [...new Set(dataGlobal.map(d=>d.provinsi))];
  const tahun = [...new Set(dataGlobal.map(d=>d.tahun))];

  document.getElementById('provinsi').innerHTML =
    '<option value="all">Semua Provinsi</option>' +
    prov.map(p=>`<option value="${p}">${p}</option>`);

  document.getElementById('tahun').innerHTML =
    '<option value="all">Semua Tahun</option>' +
    tahun.map(t=>`<option value="${t}">${t}</option>`);
}

// ===== AVERAGE =====
function getAverageData(prov){
  const dataProv = dataGlobal.filter(d =>
    normalizeProv(d.provinsi) === normalizeProv(prov)
  );

  if(dataProv.length === 0) return { serapan: 0, konsumsi: 0 };

  const totalSerapan = dataProv.reduce((sum,d)=> sum + d.serapan, 0);
  const totalKonsumsi = dataProv.reduce((sum,d)=> sum + d.konsumsi, 0);

  return {
    serapan: Math.round(totalSerapan / dataProv.length),
    konsumsi: Math.round(totalKonsumsi / dataProv.length)
  };
}

// ===== COLOR =====
function getColor(value){
  return value > 100000 ? '#1d4ed8' :
         value > 80000  ? '#2563eb' :
         value > 60000  ? '#3b82f6' :
         value > 40000  ? '#60a5fa' :
                          '#bfdbfe';
}

// ===== MAP =====
function loadMap(){
  fetch('data/indonesia.geojson')
  .then(res=>res.json())
  .then(geo => {

    const geoLayer = L.geoJSON(geo,{

      filter:(feature)=>{
        const prov = normalizeProv(feature.properties.NAME_1);
        return [
          "sulawesiutara",
          "gorontalo",
          "sulawesitengah",
          "sulawesibarat",
          "sulawesiselatan",
          "sulawesitenggara"
        ].includes(prov);
      },

      style:(feature)=>{
        const prov = feature.properties.NAME_1;
        const avg = getAverageData(prov);

        return {
          fillColor: getColor(avg.serapan),
          weight: 1.5,
          color: '#1d3557',
          fillOpacity: 0.8
        };
      },

      onEachFeature:(feature,layer)=>{
        const prov = feature.properties.NAME_1;

        layer.on({

          mouseover:(e)=>{
            const avg = getAverageData(prov);

            e.target.setStyle({
              weight:2,
              color:'#000',
              fillOpacity:1
            });

            e.target.bindTooltip(`
              <b>${prov}</b><br>
              Rata-rata Serapan: ${avg.serapan.toLocaleString()} ton<br>
              Rata-rata Konsumsi: ${avg.konsumsi.toLocaleString()} ton
            `).openTooltip();
          },

          mouseout:(e)=>{
            geoLayer.resetStyle(e.target);
          },

          click:(e)=>{
            document.getElementById('provinsi').value = prov;

            map.fitBounds(e.target.getBounds(), {
              padding: [20, 20],
              maxZoom: 8
            });

            updateChart();
          }

        });
      }

    }).addTo(map);

    map.fitBounds([
      [1.5,118],
      [-6,125]
    ]);
  });
}

// ===== CHART =====
const produksiChart = new Chart(
  document.getElementById('serapanChart'),
  {
    type:'bar',
    data:{
      labels:[],
      datasets:[{
        label:'Serapan',
        data:[],
        backgroundColor:'#3b82f6'
      }]
    }
  }
);

const konsumsiChart = new Chart(
  document.getElementById('konsumsiChart'),
  {
    type:'line',
    data:{
      labels:[],
      datasets:[{
        label:'Konsumsi',
        data:[],
        borderColor:'#ef4444',
        tension:0.3
      }]
    }
  }
);

// ===== UPDATE =====
function updateChart(){
  const prov = document.getElementById('provinsi').value;
  const tahun = document.getElementById('tahun').value;

  const filtered = dataGlobal.filter(d =>
    (prov==='all'||d.provinsi===prov) &&
    (tahun==='all'||d.tahun==tahun)
  );

  // CHART
  produksiChart.data.labels = filtered.map(d=>d.provinsi);
  produksiChart.data.datasets[0].data = filtered.map(d=>d.serapan);
  produksiChart.update();

  konsumsiChart.data.labels = filtered.map(d=>d.provinsi);
  konsumsiChart.data.datasets[0].data = filtered.map(d=>d.konsumsi);
  konsumsiChart.update();

  // TABLE
  currentPage = 1;
  currentData = filtered;
  updateTable();

  // 🔥 INSIGHT LEBIH CERDAS
  if(filtered.length > 0){
    const maxSerapan = [...filtered].sort((a,b)=>b.serapan-a.serapan)[0];
    const maxKonsumsi = [...filtered].sort((a,b)=>b.konsumsi-a.konsumsi)[0];

    document.getElementById('insight').innerHTML = `
      <b>Insight Data:</b><br>
      🔵 Serapan tertinggi: <b>${maxSerapan.provinsi}</b> (${maxSerapan.serapan.toLocaleString()} ton)<br>
      🔴 Konsumsi tertinggi: <b>${maxKonsumsi.provinsi}</b> (${maxKonsumsi.konsumsi.toLocaleString()} ton)<br>
      📊 Total data ditampilkan: ${filtered.length}
    `;
  }else{
    document.getElementById('insight').innerHTML = "Data tidak ditemukan";
  }
}

// ===== TABLE =====
function updateTable(){
  const tbody = document.querySelector('#dataTable tbody');
  tbody.innerHTML = '';

  if(currentData.length === 0){
    tbody.innerHTML = `<tr><td colspan="5">Data tidak ditemukan</td></tr>`;
    return;
  }

  const sorted = [...currentData].sort((a,b)=> b.serapan - a.serapan);

  const start = (currentPage - 1) * rowsPerPage;
  const paginated = sorted.slice(start, start + rowsPerPage);

  paginated.forEach((d,index)=>{
    tbody.innerHTML += `
      <tr>
        <td>${start + index + 1}</td>
        <td>${d.provinsi}</td>
        <td>${d.tahun}</td>
        <td>${d.serapan.toLocaleString()}</td>
        <td>${d.konsumsi.toLocaleString()}</td>
      </tr>
    `;
  });

  const totalPages = Math.ceil(sorted.length / rowsPerPage);

  document.getElementById('pageInfo').innerText =
    `Halaman ${currentPage} dari ${totalPages}`;

  document.getElementById('prevBtn').disabled = currentPage === 1;
  document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

// ===== EVENT =====
document.getElementById('btnCari').onclick = updateChart;

document.getElementById('prevBtn').onclick = ()=>{
  currentPage--;
  updateTable();
};

document.getElementById('nextBtn').onclick = ()=>{
  currentPage++;
  updateTable();
};

// 🔥 FIX HAMBURGER
document.getElementById('btnMenu').onclick = ()=>{
  document.getElementById('navMenu').classList.toggle('active');
};