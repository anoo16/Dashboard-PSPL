let dataGlobal = [];
let selectedProv1 = "all";
let selectedProv2 = "all";
let clickToggle = 1; // buat gantian isi provinsi 1 & 2

// ===== MAP =====
const map = L.map('mapCompare').setView([-2.5,120],5);

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
  updateChart();
});

// ===== NORMALIZE =====
function normalize(str){
  return str.toLowerCase().replace(/\s/g,'').trim();
}

// ===== FILTER =====
function initFilter(){
  const prov = [...new Set(dataGlobal.map(d=>d.provinsi))];

  document.getElementById('provinsi1').innerHTML =
    '<option value="all">Pilih Provinsi</option>' +
    prov.map(p=>`<option value="${p}">${p}</option>`);

  document.getElementById('provinsi2').innerHTML =
    '<option value="all">Pilih Provinsi</option>' +
    prov.map(p=>`<option value="${p}">${p}</option>`);
}

// ===== MAP =====
function loadMap(){
  fetch('data/indonesia.geojson')
  .then(res=>res.json())
  .then(geo => {

    const geoLayer = L.geoJSON(geo,{

      filter:(f)=>{
        const p = normalize(f.properties.NAME_1);
        return [
          "sulawesiutara",
          "gorontalo",
          "sulawesitengah",
          "sulawesibarat",
          "sulawesiselatan",
          "sulawesitenggara"
        ].includes(p);
      },

      style:{
        color:'#1d4ed8',
        weight:1.5,
        fillColor:'#3b82f6',
        fillOpacity:0.6
      },

      onEachFeature:(feature,layer)=>{
        const prov = feature.properties.NAME_1;

        layer.on({
          click:(e)=>{

            // 🔥 isi provinsi bergantian
            if(clickToggle === 1){
              selectedProv1 = prov;
              document.getElementById('provinsi1').value = prov;
              clickToggle = 2;
            } else {
              selectedProv2 = prov;
              document.getElementById('provinsi2').value = prov;
              clickToggle = 1;
            }

            map.fitBounds(e.target.getBounds(), {
              padding:[20,20],
              maxZoom:8
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
const chart = new Chart(
  document.getElementById('compareChart'),
  {
    type:'line',
    data:{ labels:[], datasets:[] },
    options:{
      responsive:true,
      plugins:{ legend:{ position:'top' } }
    }
  }
);

// ===== UPDATE =====
function updateChart(){

  selectedProv1 = document.getElementById('provinsi1').value;
  selectedProv2 = document.getElementById('provinsi2').value;

  const tahun = [...new Set(dataGlobal.map(d=>d.tahun))].sort();
  chart.data.labels = tahun;

  const datasets = [];

  const provList = [selectedProv1, selectedProv2].filter(p => p !== 'all');

  provList.forEach(p=>{
    const dataProv = dataGlobal.filter(d=>d.provinsi === p);

    // SERAPAN
    datasets.push({
      label: p + " (Serapan)",
      data: tahun.map(t=>{
        const found = dataProv.find(d=>d.tahun == t);
        return found ? found.serapan : null;
      }),
      tension:0.3
    });

    // KONSUMSI
    datasets.push({
      label: p + " (Konsumsi)",
      data: tahun.map(t=>{
        const found = dataProv.find(d=>d.tahun == t);
        return found ? found.konsumsi : null;
      }),
      borderDash:[5,5],
      tension:0.3
    });
  });

  chart.data.datasets = datasets;
  chart.update();

  updateTable();
}

// ===== TABLE =====
function updateTable(){
  const tbody = document.querySelector('#compareTable tbody');
  tbody.innerHTML = '';

  let filtered = dataGlobal;

  if(selectedProv1 !== 'all' && selectedProv2 !== 'all'){
    filtered = dataGlobal.filter(d =>
      d.provinsi === selectedProv1 || d.provinsi === selectedProv2
    );
  }

  filtered
    .sort((a,b)=> a.tahun - b.tahun)
    .forEach((d,i)=>{
      tbody.innerHTML += `
        <tr>
          <td>${i+1}</td>
          <td>${d.provinsi}</td>
          <td>${d.tahun}</td>
          <td>${d.serapan.toLocaleString()}</td>
          <td>${d.konsumsi.toLocaleString()}</td>
        </tr>
      `;
    });
}

// ===== SIDEBAR =====
const toggleBtn = document.getElementById('toggleTableBtn');
const panel = document.getElementById('tablePanel');

let isOpen = false;

toggleBtn.onclick = ()=>{
  isOpen = !isOpen;

  if(isOpen){
    panel.style.right = "0";
    toggleBtn.innerText = "◀";
  }else{
    panel.style.right = "-420px";
    toggleBtn.innerText = "▶";
  }
};

// ===== EVENT =====
document.getElementById('provinsi1').onchange = updateChart;
document.getElementById('provinsi2').onchange = updateChart;

document.getElementById('resetBtn').onclick = ()=>{
  selectedProv1 = 'all';
  selectedProv2 = 'all';

  document.getElementById('provinsi1').value = 'all';
  document.getElementById('provinsi2').value = 'all';

  map.setView([-2.5,120],5);

  updateChart();
};