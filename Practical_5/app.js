let net;
let classifier;
const webcamElement = document.getElementById('webcam');
const predictionText = document.getElementById('prediction-text');
const predictionOverlay = document.getElementById('prediction-overlay');
const personNameInput = document.getElementById('person-name');
const snapButton = document.getElementById('snap-btn');
const personsList = document.getElementById('persons-list');
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');
const clearBtn = document.getElementById('clear-btn');
const loadingInfo = document.getElementById('loading-info');

let classNames = {}; // maps classId (number) to Name (string)
let currentClassId = 0;
let exampleCounts = {}; // maps classId to count

async function app() {
    console.log('Loading mobilenet..');
    loadingInfo.innerText = "Loading MobileNet model...";
    
    // Load the model.
    net = await mobilenet.load();
    console.log('Successfully loaded model');
    
    loadingInfo.innerText = "Setting up webcam...";
    // Create the classifier.
    classifier = knnClassifier.create();

    try {
        await setupWebcam();
        loadingInfo.style.display = 'none';
    } catch (e) {
        loadingInfo.innerHTML = "Error accessing webcam.<br>Please ensure you are using localhost (e.g., run a local server) and have granted camera permissions.";
        loadingInfo.style.color = "#FA8072";
        console.error(e);
        return; // Stop initialization
    }

    // Set up standard listeners
    snapButton.addEventListener('click', () => {
        const name = personNameInput.value.trim();
        if (name) {
            addExample(name);
        } else {
            alert('Please enter a name first!');
        }
    });

    saveBtn.addEventListener('click', saveModel);
    loadBtn.addEventListener('click', loadModel);
    clearBtn.addEventListener('click', clearModel);

    // Initial load check if existing model is in localStorage
    if (localStorage.getItem("knnClassifier")) {
        loadModel();
    }

    // continuous prediction loop
    predictLoop();
}

async function setupWebcam() {
    return new Promise((resolve, reject) => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            reject(new Error("Webcam access not supported in this browser context. You must serve the files using a local web server (localhost) or HTTPS."));
            return;
        }
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(stream => {
                webcamElement.srcObject = stream;
                webcamElement.onloadedmetadata = () => {
                    resolve();
                };
            })
            .catch(error => {
                reject(error);
            });
    });
}

async function addExample(name) {
    // Find if name already exists
    let classId = -1;
    for (const [id, cName] of Object.entries(classNames)) {
        if (cName.toLowerCase() === name.toLowerCase()) {
            classId = parseInt(id);
            break;
        }
    }
    
    // If not exists, create new class
    if (classId === -1) {
        classId = currentClassId++;
        classNames[classId] = name;
        exampleCounts[classId] = 0;
    }
    
    // Get image data from video
    const img = tf.browser.fromPixels(webcamElement);
    
    // Pass image through mobilenet to get features
    const activation = net.infer(img, true);
    
    // Pass features into KNN
    classifier.addExample(activation, classId);
    
    exampleCounts[classId] = (exampleCounts[classId] || 0) + 1;
    
    // Flash effect on video to signify capture
    webcamElement.classList.add('flash');
    setTimeout(() => {
        webcamElement.classList.remove('flash');
    }, 200);

    // Save image to the backend server
    saveImageToBackend(name);

    img.dispose();
    updatePersonsList();
}

async function saveImageToBackend(label) {
    try {
        // Create an off-screen canvas to capture a JPEG frame from video
        const canvas = document.createElement('canvas');
        canvas.width = webcamElement.videoWidth;
        canvas.height = webcamElement.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(webcamElement, 0, 0, canvas.width, canvas.height);
        
        // Get base64 string
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        // Send to our local Node.js server
        const response = await fetch('http://localhost:3000/save-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageBase64: dataUrl,
                label: label
            })
        });
        
        const result = await response.json();
        if(!response.ok) {
            console.error('Failed to save image:', result.error);
        } else {
            console.log('Image saved successfully via backend:', result.message);
        }
    } catch(e) {
        console.error("Could not communicate with backend to save image:", e);
    }
}

async function predictLoop() {
    if (classifier.getNumClasses() > 0) {
        const img = tf.browser.fromPixels(webcamElement);
        const activation = net.infer(img, true);
        
        try {
            const result = await classifier.predictClass(activation);
            // KNN gives us a default string if we started with Ints, e.g. "0", "1".
            const predictedLabel = classNames[result.label] || classNames[result.classIndex] || result.label;
            
            // Confidence thresholding
            if (result.confidences[result.label] > 0.5) {
                // Determine confidence accurately depending on model predictions
                const maxConfidence = Math.max(...Object.values(result.confidences));
                predictionText.innerText = `Detected: ${predictedLabel} (${Math.round(maxConfidence*100)}%)`;
                predictionOverlay.style.display = 'block';
            } else {
                predictionOverlay.style.display = 'none';
            }
        } catch(e) {
            console.log("Prediction error", e);
        }
        
        img.dispose();
    } else {
        predictionOverlay.style.display = 'none';
    }
    
    await tf.nextFrame();
    predictLoop();
}

function updatePersonsList() {
    personsList.innerHTML = '';
    for (const [idStr, count] of Object.entries(exampleCounts)) {
        const id = parseInt(idStr);
        const name = classNames[idStr];
        const li = document.createElement('li');
        
        const leftDiv = document.createElement('div');
        leftDiv.style.display = "flex";
        leftDiv.style.flexDirection = "column";

        const nameSpan = document.createElement('span');
        nameSpan.innerText = name;
        nameSpan.style.fontWeight = "600";
        nameSpan.style.color = "var(--text-dark)";
        
        const countSpan = document.createElement('span');
        countSpan.innerText = `${count} samples`;
        countSpan.style.color = "var(--text-light)";
        countSpan.style.fontSize = "0.85rem";
        
        leftDiv.appendChild(nameSpan);
        leftDiv.appendChild(countSpan);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.className = 'delete-icon-btn';
        deleteBtn.title = `Delete ${name}`;
        deleteBtn.onclick = () => removePerson(id);
        
        li.appendChild(leftDiv);
        li.appendChild(deleteBtn);
        personsList.appendChild(li);
    }
    if (Object.keys(exampleCounts).length === 0) {
        personsList.innerHTML = '<li style="color: var(--text-light)">No one labeled yet.</li>';
    }
}

function removePerson(classId) {
    if(confirm(`Are you sure you want to remove all examples for ${classNames[classId]}?`)) {
        // Unfortunately standard tfjs knn classifier doesn't have a direct "removeClass" method,
        // so we must clear and reload from a modified dataset.
        const datasetObj = classifier.getClassifierDataset();
        // Remove the target class from dictionary
        delete datasetObj[classId]; 
        
        classifier.clearAllClasses();
        // Reload all remaining
        Object.keys(datasetObj).forEach((key) => {
            // Note: need to re-wrap in tensors
            classifier.setClassifierDataset(datasetObj); 
        });
        
        delete classNames[classId];
        delete exampleCounts[classId];
        
        updatePersonsList();
        // Auto-save changes locally so state doesn't desync on reload
        saveModelSilently();
    }
}

function saveModelSilently() {
    if (classifier.getNumClasses() === 0) {
        localStorage.removeItem("knnClassifier");
        localStorage.setItem("knnClassNames", JSON.stringify(classNames));
        localStorage.setItem("knnCounts", JSON.stringify(exampleCounts));
        return;
    }
    const dataset = classifier.getClassifierDataset();
    const datasetObj = {};
    Object.keys(dataset).forEach((key) => {
      const data = dataset[key].dataSync();
      datasetObj[key] = {
          data: Array.from(data),
          shape: dataset[key].shape
      };
    });
    
    localStorage.setItem("knnClassifier", JSON.stringify(datasetObj));
    localStorage.setItem("knnClassNames", JSON.stringify(classNames));
    localStorage.setItem("knnCounts", JSON.stringify(exampleCounts));
    localStorage.setItem("knnCurrentId", currentClassId.toString());
}

// Model Save/Load functionality using LocalStorage
function saveModel() {
    if (classifier.getNumClasses() === 0) {
        alert("No model data to save!");
        return;
    }
    const dataset = classifier.getClassifierDataset();
    const datasetObj = {};
    Object.keys(dataset).forEach((key) => {
      const data = dataset[key].dataSync();
      datasetObj[key] = {
          data: Array.from(data),
          shape: dataset[key].shape
      };
    });
    
    localStorage.setItem("knnClassifier", JSON.stringify(datasetObj));
    localStorage.setItem("knnClassNames", JSON.stringify(classNames));
    localStorage.setItem("knnCounts", JSON.stringify(exampleCounts));
    localStorage.setItem("knnCurrentId", currentClassId.toString());
    
    alert("Model data saved successfully!");
}

function loadModel() {
    const jsonStr = localStorage.getItem("knnClassifier");
    if (!jsonStr) {
        alert("No saved model found.");
        return;
    }
    
    try {
        const datasetObj = JSON.parse(jsonStr);
        const tensorObj = {};
        Object.keys(datasetObj).forEach((key) => {
            tensorObj[key] = tf.tensor2d(datasetObj[key].data, datasetObj[key].shape);
        });
        
        // This fully clears existing dataset and replaces it
        classifier.setClassifierDataset(tensorObj);
        
        classNames = JSON.parse(localStorage.getItem("knnClassNames") || "{}");
        exampleCounts = JSON.parse(localStorage.getItem("knnCounts") || "{}");
        currentClassId = parseInt(localStorage.getItem("knnCurrentId") || "0");
        
        updatePersonsList();
        console.log("Model loaded!");
        alert("Model data loaded successfully!");
    } catch(e) {
        console.error("Error loading model", e);
        alert("Failed to load saved model.");
    }
}

function clearModel() {
    if(confirm("Are you sure you want to clear your current model state? Saved data will not be erased unless you save again.")) {
        if(classifier.getNumClasses() > 0) {
            classifier.clearAllClasses();
        }
        classNames = {};
        exampleCounts = {};
        currentClassId = 0;
        updatePersonsList();
    }
}

// Initialize App
app();
