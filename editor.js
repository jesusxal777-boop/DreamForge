window.addEventListener('load', () => {
    // Simular carga para el splash screen
    setTimeout(() => {
        document.getElementById('loader').style.opacity = '0';
        document.getElementById('app').classList.remove('hidden');
        setTimeout(() => document.getElementById('loader').remove(), 800);
    }, 2000);
});

const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('fileInput');
const layersContainer = document.getElementById('layers-container');
const masterFilter = document.getElementById('masterFilter');

let activeVideo = null;
let isPlaying = false;

// --- Drag and Drop ---
dropZone.onclick = () => fileInput.click();

dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = "#00d9ff"; };
dropZone.ondragleave = () => { dropZone.style.borderColor = "#333"; };

dropZone.ondrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
};

fileInput.onchange = (e) => handleFiles(e.target.files);

function handleFiles(files) {
    for (let file of files) {
        const url = URL.createObjectURL(file);
        addLayer(file.name, file.type);
        if (file.type.startsWith('video') && !activeVideo) {
            initVideo(url);
        }
    }
}

function addLayer(name, type) {
    const div = document.createElement('div');
    div.className = 'layer';
    div.innerHTML = `<span>${type.includes('video') ? '🎬' : '🖼️'} ${name}</span>`;
    layersContainer.appendChild(div);
}

function initVideo(url) {
    activeVideo = document.createElement('video');
    activeVideo.src = url;
    activeVideo.onloadedmetadata = () => {
        canvas.width = activeVideo.videoWidth;
        canvas.height = activeVideo.videoHeight;
        render();
    };
}

function render() {
    if (!activeVideo) return;
    ctx.filter = masterFilter.value;
    ctx.drawImage(activeVideo, 0, 0, canvas.width, canvas.height);
    if (isPlaying) requestAnimationFrame(render);
}

document.getElementById('playBtn').onclick = () => {
    if (!activeVideo) return;
    isPlaying = !isPlaying;
    isPlaying ? activeVideo.play() : activeVideo.pause();
    document.getElementById('playBtn').innerText = isPlaying ? "⏸" : "▶";
    render();
};

// --- Exportación con Audio ---
document.getElementById('exportBtn').onclick = async () => {
    if (!activeVideo) return;
    
    const status = document.getElementById('statusText');
    status.innerText = "FORJANDO...";
    status.style.color = "#00d9ff";

    const stream = canvas.captureStream(30);
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(activeVideo);
    const dest = audioCtx.createMediaStreamDestination();
    
    source.connect(dest);
    source.connect(audioCtx.destination);

    const combined = new MediaStream([
        ...stream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
    ]);

    const recorder = new MediaRecorder(combined, { mimeType: 'video/webm' });
    const chunks = [];

    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "DreamForge_Master.webm";
        a.click();
        status.innerText = "LISTO PARA FORJAR";
    };

    activeVideo.currentTime = 0;
    recorder.start();
    activeVideo.play();
    isPlaying = true;
    render();

    activeVideo.onended = () => {
        recorder.stop();
        isPlaying = false;
    };
};
