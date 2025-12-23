// --- GLOBAL STATE ---
let expressions = [];
let activeInputId = null;
let currentTheme = 'light';
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

// --- PLOTLY CONFIG ---
const layoutDefaults = {
    margin: { t: 30, b: 40, l: 50, r: 20 },
    xaxis: { 
        showgrid: true, zeroline: true, 
        gridcolor: '#e6e6e6', zerolinecolor: '#444', 
        range: [-10, 10], title: { text: 'X' } 
    },
    yaxis: { 
        showgrid: true, zeroline: true, 
        gridcolor: '#e6e6e6', zerolinecolor: '#444', 
        range: [-6, 6], title: { text: 'Y' } 
    },
    paper_bgcolor: '#fff', 
    plot_bgcolor: '#fff',
    showlegend: true, 
    legend: { x: 0, y: 1, bgcolor: 'rgba(255,255,255,0.5)' },
    hovermode: 'closest'
};

const config = { 
    responsive: true, 
    scrollZoom: true, 
    displayModeBar: false 
};

const graphDiv = document.getElementById('graph-container');
Plotly.newPlot(graphDiv, [], layoutDefaults, config);
addNewExpression();

// --- LOGIC ---

function addNewExpression(initialValue = '') {
    const id = 'expr-' + Date.now();
    expressions.push(id);
    
    const container = document.getElementById('equation-list');
    const div = document.createElement('div');
    div.className = 'expression-row';
    div.id = `row-${id}`;
    
    const color = `hsl(${Math.random() * 360}, 70%, 50%)`;
    div.style.borderLeftColor = color;
    div.dataset.color = color;

    div.innerHTML = `
        <div class="color-indicator" style="background:${color}"></div>
        <div class="input-wrapper">
            <input type="text" id="${id}" placeholder="Expression (e.g. y=x^2 or z=x*y)..." 
                   value="${initialValue}" 
                   onfocus="activeInputId='${id}'" 
                   onkeyup="if(event.key==='Enter') evaluateAll(); else debounceEvaluate()">
            <div id="res-${id}" class="expr-result"></div>
        </div>
        <button class="remove-expr" onclick="removeExpression('${id}')"><i class="fas fa-times"></i></button>
    `;
    
    container.appendChild(div);
    document.getElementById(id).focus();
    activeInputId = id;
    
    if(initialValue) evaluateAll();
}

function removeExpression(id) {
    expressions = expressions.filter(e => e !== id);
    document.getElementById(`row-${id}`).remove();
    evaluateAll();
}

// Debounce to prevent lag while typing
let debounceTimer;
function debounceEvaluate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(evaluateAll, 400); 
}

function clearAll() {
    document.getElementById('equation-list').innerHTML = '';
    expressions = [];
    addNewExpression();
    Plotly.newPlot(graphDiv, [], layoutDefaults, config);
    updateGraphTheme(currentTheme);
}

function evaluateAll() {
    let traces = [];
    
    expressions.forEach((id) => {
        const input = document.getElementById(id);
        const resDiv = document.getElementById(`res-${id}`);
        if(!input) return;
        
        // 1. Clean the Input (Remove extra spaces for detection)
        let raw = input.value.toLowerCase();
        let clean = raw.replace(/\s+/g, ''); // Remove ALL spaces
        
        resDiv.innerText = ""; // Clear previous result
        if(!clean) return;

        const row = document.getElementById(`row-${id}`);
        const color = row.dataset.color;
        
        // 2. Check for Simple Arithmetic (No variables x, y, z)
        if (!clean.match(/[xyz]/)) {
            try {
                // Use the raw input so math.js can handle spaces if it wants
                const result = math.evaluate(raw);
                const formatted = math.format(result, {precision: 5, lowerExp: -9, upperExp: 9});
                resDiv.innerText = `= ${formatted}`;
                
                if (typeof result === 'number') {
                     traces.push({
                        x: [-100, 100], y: [result, result], 
                        mode: 'lines', type: 'scatter', name: `y=${formatted}`,
                        line: { color: color, width: 2, dash: 'dash' }
                     });
                }
                return;
            } catch (e) {}
        }

        // 3. Robust 2D vs 3D Detection
        // It is 3D if: starts with 'z=' OR (has x AND y AND does NOT start with 'y=')
        const startsWithY = clean.startsWith('y=');
        const startsWithZ = clean.startsWith('z=');
        const hasX = clean.includes('x');
        const hasY = clean.includes('y');
        
        const is3D = startsWithZ || (hasX && hasY && !startsWithY);

        try {
            // Remove 'y=' or 'z=' from the original string for evaluation
            // We use regex to handle spaces like "y = "
            let exprStr = raw.replace(/^[yz]\s*=\s*/, '');
            const labelName = raw.includes('=') ? raw : (is3D ? `z=${raw}` : `y=${raw}`); 

            if(is3D) {
                traces.push(generate3DTrace(exprStr, color, labelName));
                resDiv.innerText = "3D Surface";
            } else {
                // 2D Plot
                const traceData = generate2DTrace(exprStr, color, labelName);
                traces.push(traceData.trace);
                
                // Root finding info
                let info = [];
                if (traceData.roots.length > 0) {
                    let rootStr = traceData.roots.slice(0, 3).join(", ");
                    if (traceData.roots.length > 3) rootStr += "...";
                    info.push(`Roots: ${rootStr}`);
                }
                
                // Y-Intercept
                try {
                    const yInt = math.evaluate(exprStr, {x: 0, e: math.e, pi: math.pi});
                    if (math.isNumeric(yInt)) info.push(`f(0)=${math.round(yInt, 2)}`);
                } catch(e){}

                resDiv.innerText = info.join(" | ");
            }
        } catch(e) { 
            console.log("Error parsing: ", raw);
        }
    });

    // Update Plot
    const is3DMode = traces.some(t => t.type === 'surface');
    let layout = JSON.parse(JSON.stringify(layoutDefaults));

    if(is3DMode) {
        layout.scene = {
            xaxis: { title: 'X', backgroundcolor: currentTheme === 'dark' ? '#1e1e1e' : '#fff' },
            yaxis: { title: 'Y', backgroundcolor: currentTheme === 'dark' ? '#1e1e1e' : '#fff' },
            zaxis: { title: 'Z', backgroundcolor: currentTheme === 'dark' ? '#1e1e1e' : '#fff' }
        };
        layout.margin = {l:0, r:0, t:0, b:0};
    } else {
        if(graphDiv.layout && graphDiv.layout.xaxis) {
            layout.xaxis.range = graphDiv.layout.xaxis.range;
            layout.yaxis.range = graphDiv.layout.yaxis.range;
        }
    }
    
    // Apply Theme
    const textColor = currentTheme === 'dark' ? '#e0e0e0' : '#333333';
    const bgColor = currentTheme === 'dark' ? '#1e1e1e' : '#ffffff';
    
    layout.paper_bgcolor = bgColor;
    layout.plot_bgcolor = bgColor;
    layout.xaxis.color = textColor;
    layout.yaxis.color = textColor;
    layout.legend = { font: { color: textColor } };

    Plotly.react(graphDiv, traces, layout, config);
}

function generate2DTrace(exprStr, color, name) {
    const expr = math.compile(exprStr);
    
    // Get X range
    let xMin = -15, xMax = 15;
    if (graphDiv.layout && graphDiv.layout.xaxis) {
        xMin = graphDiv.layout.xaxis.range[0];
        xMax = graphDiv.layout.xaxis.range[1];
    }

    const step = (xMax - xMin) / 400; 
    const xValues = math.range(xMin, xMax, step).toArray();
    let roots = [];
    
    const yValues = xValues.map((x, i) => {
        try { 
            const y = expr.evaluate({x: x, e: math.e, pi: math.pi}); 
            // Root check
            if (i > 0) {
                const prevY = expr.evaluate({x: xValues[i-1], e: math.e, pi: math.pi});
                if ((y > 0 && prevY < 0) || (y < 0 && prevY > 0) || y === 0) {
                    roots.push(math.round(x, 2));
                }
            }
            return y; 
        } catch { return null; }
    });
    
    return {
        trace: {
            x: xValues, y: yValues, type: 'scatter', mode: 'lines',
            name: name,
            line: { color: color, width: 2.5 }
        },
        roots: [...new Set(roots)]
    };
}

function generate3DTrace(exprStr, color, name) {
    const expr = math.compile(exprStr);
    const range = math.range(-10, 10, 0.5).toArray();
    const zValues = [];
    
    for(let y of range) {
        let row = [];
        for(let x of range) {
            try { 
                // Evaluate z for every x,y pair
                const val = expr.evaluate({x:x, y:y, pi:math.pi}); 
                row.push(val);
            } catch { 
                row.push(null); 
            }
        }
        zValues.push(row);
    }
    
    return {
        x: range, y: range, z: zValues, type: 'surface',
        name: name,
        colorscale: 'Viridis', 
        showscale: false, 
        opacity: 0.8,
        contours: {
            z: { show: true, usecolormap: true, highlightcolor: "#42f462", project: { z: true } }
        }
    };
}

// --- UTILS ---
function zoomIn() { if(graphDiv.layout) Plotly.relayout(graphDiv, {'xaxis.range': [graphDiv.layout.xaxis.range[0] * 0.8, graphDiv.layout.xaxis.range[1] * 0.8], 'yaxis.range': [graphDiv.layout.yaxis.range[0] * 0.8, graphDiv.layout.yaxis.range[1] * 0.8]}); }
function zoomOut() { if(graphDiv.layout) Plotly.relayout(graphDiv, {'xaxis.range': [graphDiv.layout.xaxis.range[0] * 1.25, graphDiv.layout.xaxis.range[1] * 1.25], 'yaxis.range': [graphDiv.layout.yaxis.range[0] * 1.25, graphDiv.layout.yaxis.range[1] * 1.25]}); }
function resetZoom() { Plotly.relayout(graphDiv, { 'xaxis.range': [-10, 10], 'yaxis.range': [-6, 6] }); }

function typeKey(char) { 
    if(!activeInputId) return; 
    const input = document.getElementById(activeInputId); 
    const start = input.selectionStart; 
    const end = input.selectionEnd; 
    input.value = input.value.substring(0, start) + char + input.value.substring(end); 
    input.focus(); 
    input.selectionStart = input.selectionEnd = start + char.length; 
    debounceEvaluate(); 
}

function backspace() { 
    if(!activeInputId) return; 
    const input = document.getElementById(activeInputId); 
    const start = input.selectionStart; 
    if(start === 0) return; 
    input.value = input.value.substring(0, start - 1) + input.value.substring(start); 
    input.focus(); 
    input.selectionStart = input.selectionEnd = start - 1; 
    debounceEvaluate(); 
}

function toggleFunctions() { document.getElementById('functions-panel').classList.toggle('hidden'); }

function switchMode(mode) { 
    document.getElementById('btn-graphical').classList.remove('active'); 
    document.getElementById('btn-simple').classList.remove('active'); 
    document.getElementById(`btn-${mode}`).classList.add('active'); 
    document.getElementById('view-graphical').classList.add('hidden-view'); 
    document.getElementById('view-simple').classList.add('hidden-view'); 
    document.getElementById(`view-${mode}`).classList.remove('hidden-view'); 
    if (mode === 'graphical') Plotly.relayout(graphDiv, { autosize: true }); 
}

function updateGraphTheme(theme) { 
    const update = {}; 
    const textColor = theme === 'dark' ? '#e0e0e0' : '#333333'; 
    const gridColor = theme === 'dark' ? '#333333' : '#e6e6e6'; 
    const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff'; 
    
    update.paper_bgcolor = bgColor; 
    update.plot_bgcolor = bgColor; 
    update['xaxis.color'] = textColor; 
    update['yaxis.color'] = textColor; 
    update['xaxis.gridcolor'] = gridColor; 
    update['yaxis.gridcolor'] = gridColor; 
    update['legend.font.color'] = textColor; 
    
    Plotly.relayout(graphDiv, update); 
}

function toggleTheme() { 
    const html = document.documentElement; 
    const icon = document.getElementById('theme-icon'); 
    if (currentTheme === 'light') { 
        html.setAttribute('data-theme', 'dark'); 
        icon.classList.remove('fa-moon'); 
        icon.classList.add('fa-sun'); 
        currentTheme = 'dark'; 
        updateGraphTheme('dark'); 
    } else { 
        html.setAttribute('data-theme', 'light'); 
        icon.classList.remove('fa-sun'); 
        icon.classList.add('fa-moon'); 
        currentTheme = 'light'; 
        updateGraphTheme('light'); 
    } 
}

// --- MEDIA RECORDING ---
function takeScreenshot() {
    Plotly.downloadImage(graphDiv, { format: 'png', width: 800, height: 600, filename: 'graph_screenshot_' + Date.now() });
}

async function toggleRecording() {
    const btn = document.getElementById('record-btn');
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: { mediaSource: "screen" } });
            mediaRecorder = new MediaRecorder(stream);
            recordedChunks = [];
            mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) recordedChunks.push(event.data); };
            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'graph_recording.webm'; a.click();
                URL.revokeObjectURL(url);
                isRecording = false; btn.classList.remove('recording-active');
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.start(); isRecording = true; btn.classList.add('recording-active');
        } catch (err) { alert("Could not start recording."); }
    } else { mediaRecorder.stop(); }
}

// --- MAGIC GRAPHS ---
const magics = { 
    "1": "z = sin(sqrt(x^2 + y^2))", 
    "2": "z = x^3 - 3*x*y^2", 
    "3": "z = sin(x)*cos(y)", 
    "4": "z = exp(-(x^2+y^2)/10)*5", 
    "5": "y = sin(x) + sin(1.1*x)", 
    "6": "y = exp(-0.1*x) * sin(2*x)", 
    "7": "y = tan(x)", 
    "8": "y = sin(x*x)", 
    "9": "y = sin(x) + sin(2*x)/2 + sin(3*x)/3", 
    "10": "y = sqrt(x)" 
};

function triggerMagic(val) { 
    clearAll(); 
    const eq = magics[val]; 
    const input = document.getElementById(expressions[0]); 
    input.value = eq; 
    evaluateAll(); 
}

// --- SIMPLE CALC ---
let simpleExpression = "";
function simpleAppend(char) { 
    const input = document.getElementById('simple-input'); 
    if (char === '.' && input.value.includes('.')) return; 
    if (input.dataset.calculated === "true") { 
        if (!['+','-','*','/','%'].includes(char)) simpleExpression = ""; 
        input.dataset.calculated = "false"; 
    } 
    simpleExpression += char; 
    input.value = simpleExpression; 
}
function simpleClear() { 
    simpleExpression = ""; 
    document.getElementById('simple-input').value = ""; 
    document.getElementById('simple-history').innerText = ""; 
    document.getElementById('simple-input').dataset.calculated = "false"; 
}
function simpleBackspace() { 
    simpleExpression = simpleExpression.slice(0, -1); 
    document.getElementById('simple-input').value = simpleExpression; 
}
function simpleCalculate() { 
    const input = document.getElementById('simple-input'); 
    const history = document.getElementById('simple-history'); 
    try { 
        const result = math.evaluate(simpleExpression); 
        history.innerText = simpleExpression + " ="; 
        input.value = result; 
        simpleExpression = result.toString(); 
        input.dataset.calculated = "true"; 
    } catch (e) { 
        input.value = "Error"; 
        simpleExpression = ""; 
    } 
}