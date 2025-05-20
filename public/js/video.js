import { loadModel, getHeadCount } from './headcount.js';

const video = document.getElementById('myVideo');
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const videoInput = document.getElementById('videoInput');
const startButton = document.querySelector('button');
const progressBar = document.getElementById('progressBar');
const progress = document.getElementById('progress');
const resultDiv = document.getElementById('result');
const maxCountElement = document.getElementById('maxCount');
const currentFrameElement = document.getElementById('currentFrame');
const totalFramesElement = document.getElementById('totalFrames');

let maxHeadCount = 0;
let frameCount = 0;

videoInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        video.src = URL.createObjectURL(file);
        startButton.disabled = false;
    }
});

async function startAnalysis() {
    try {
        // Reset state
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.currentTime = 0;
        maxHeadCount = 0;
        frameCount = 0;
        startButton.disabled = true;
        progressBar.style.display = 'block';
        resultDiv.style.display = 'none';
        progress.style.width = '0%';

        // Initialize the model
        await loadModel();

        const frameInterval = 0.5; // Process every 500ms
        const totalFrames = Math.floor(video.duration / frameInterval);
        let processedFrames = 0;

        const processFrame = async () => {
            try {
                if (video.currentTime >= video.duration) {
                    // Analysis complete
                    progressBar.style.display = 'none';
                    resultDiv.style.display = 'block';
                    startButton.disabled = false;
                    document.getElementById('analysisStatus').textContent = 'Complete';
                    console.log("Analysis complete. Maximum head count:", maxHeadCount);
                    maxCountElement.textContent = maxHeadCount;
                    return;
                }

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const headCount = await getHeadCount(canvas);
                maxHeadCount = Math.max(maxHeadCount, headCount);
                
                // Update the display immediately when we find a new maximum
                maxCountElement.textContent = maxHeadCount;
                document.getElementById('analysisStatus').textContent = 'Processing...';
                resultDiv.style.display = 'block';
                
                processedFrames++;
                const progressPercent = (processedFrames / totalFrames) * 100;
                progress.style.width = `${Math.min(progressPercent, 100)}%`;
                
                frameCount++;
                maxCountElement.textContent = maxHeadCount;

                // Wait for the video to be ready before processing next frame
                video.currentTime += frameInterval;
                return new Promise((resolve) => {
                    const onSeeked = () => {
                        video.removeEventListener('seeked', onSeeked);
                        resolve();
                    };
                    video.addEventListener('seeked', onSeeked);
                });
            } catch (error) {
                console.error('Frame processing error:', error);
                throw error;
            }
        };

        // Process frames sequentially
        while (video.currentTime < video.duration) {
            await processFrame();
        }

    } catch (error) {
        console.error('Analysis failed:', error);
        progressBar.style.display = 'none';
        resultDiv.style.display = 'block';
        resultDiv.innerHTML += `<p style="color: red;">Error: ${error.message}</p>`;
        startButton.disabled = false;
    }
}

window.startAnalysis = startAnalysis;