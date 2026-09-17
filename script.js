// Setup Canvas
const canvas = document.getElementById('sketchpad');
const ctx = canvas.getContext('2d');
const container = document.querySelector('.canvas-container');

// Menyesuaikan ukuran internal canvas
function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Variabel Drawing & State
let isDrawing = false;
let currentColor = '#ff453a'; 
const currentToolText = document.getElementById('currentToolText');

// --- SETUP WEB AUDIO API ---
let audioCtx;
let oscillator;
let gainNode;

// Fungsi untuk inisialisasi audio (harus dipanggil setelah interaksi user)
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Fungsi menentukan jenis suara berdasarkan instrumen
function getWaveform(toolName) {
    switch(toolName) {
        case 'TRUMPET': return 'sawtooth';   // Suara tajam/kasar
        case 'CRYSTAL BELL': return 'sine';  // Suara murni/halus
        case 'SPACE SYNTH': return 'square'; // Suara retro 8-bit
        case 'PIANO': return 'triangle';     // Suara lembut
        case 'MARIMBA': return 'sine';       // Suara murni
        case 'CYMBALS': return 'sawtooth';   // Pengganti sementara untuk noise
        default: return 'sine';
    }
}

// Menghitung nada (frekuensi) berdasarkan posisi Y (Makin ke atas makin tinggi)
function getFrequency(yPosition) {
    const minFreq = 200;  // Nada terendah (Hz)
    const maxFreq = 1200; // Nada tertinggi (Hz)
    // Balik koordinat Y agar atas = tinggi, bawah = rendah
    const invertedY = canvas.height - yPosition;
    const percent = invertedY / canvas.height;
    return minFreq + (percent * (maxFreq - minFreq));
}
// ---------------------------

// Event Listeners untuk menggambar (Mouse)
canvas.addEventListener('mousedown', startPosition);
canvas.addEventListener('mouseup', endPosition);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseout', endPosition);

function startPosition(e) {
    isDrawing = true;
    
    // Mulai Audio
    initAudio();
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;

    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();

    // Setel jenis suara sesuai palet yang aktif
    oscillator.type = getWaveform(currentToolText.textContent);
    oscillator.frequency.setValueAtTime(getFrequency(y), audioCtx.currentTime);

    // Fade-in volume agar tidak terdengar bunyi 'klik' kasar (pop)
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05); // Volume maksimal 0.3

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();

    draw(e);
}

function endPosition() {
    isDrawing = false;
    ctx.beginPath();

    // Matikan Audio dengan fade-out
    if (oscillator && gainNode) {
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
        oscillator.stop(audioCtx.currentTime + 0.1);
        oscillator = null;
    }
}

function draw(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update frekuensi/nada audio secara real-time saat mouse digeser
    if (oscillator) {
        // Gunakan setTargetAtTime agar transisi nada lebih mulus (glissando)
        oscillator.frequency.setTargetAtTime(getFrequency(y), audioCtx.currentTime, 0.01);
    }

    // Logika menggambar visual
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = currentColor;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

// Fungsi Membersihkan Canvas
document.getElementById('clearBtn').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Interaksi Tombol Palette
const pads = document.querySelectorAll('.pad');

pads.forEach(pad => {
    pad.addEventListener('click', () => {
        pads.forEach(p => {
            p.classList.remove('active');
            p.style.backgroundColor = '';
            p.style.borderColor = 'transparent';
        });

        pad.classList.add('active');
        const toolColor = pad.getAttribute('data-color');
        pad.style.borderColor = toolColor;
        pad.style.backgroundColor = toolColor + '20'; 
        
        currentColor = toolColor;
        currentToolText.textContent = pad.getAttribute('data-tool');
    });
});