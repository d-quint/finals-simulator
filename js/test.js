// Test Interface JavaScript
let questionSet = null;
let originalQuestionSet = null; // Store the original unprocessed question set
let currentQuestionIndex = 0;
let userAnswers = {};
let startTime = null;
let timerInterval = null;
let testSubmitted = false;
let isShading = false;
let shadingTimeout = null;

// Shading simulation configuration
const SHADING_DURATION_SECONDS = 1.75;

// Helper function to preserve spaces around LaTeX expressions
function preserveSpacesAroundLatex(text) {
    if (!text) return text;
    
    // First, convert line breaks to HTML line breaks
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'); // Normalize line endings
    text = text.replace(/\n/g, '<br>'); // Convert to HTML line breaks
    
    // Replace spaces before and after inline math with non-breaking spaces
    text = text.replace(/(\s+)\$([^$]+)\$(\s+)/g, '&nbsp;$$$2$$&nbsp;');
    text = text.replace(/^(\s*)\$([^$]+)\$/gm, '&nbsp;$$$2$$');
    text = text.replace(/\$([^$]+)\$(\s+)/g, '$$$1$$&nbsp;');
    text = text.replace(/(\s+)\$([^$]+)\$$/gm, '&nbsp;$$$2$$');
    
    // Handle display math - fix the extra dollar signs
    text = text.replace(/(\s+)\$\$([^$]+)\$\$(\s+)/g, '&nbsp;$$$$$2$$$$&nbsp;');
    text = text.replace(/^(\s*)\$\$([^$]+)\$\$/gm, '&nbsp;$$$$$2$$$$');
    text = text.replace(/\$\$([^$]+)\$\$(\s+)/g, '$$$$$1$$$$&nbsp;');
    text = text.replace(/(\s+)\$\$([^$]+)\$\$$/gm, '&nbsp;$$$$$2$$$$');
    
    // Handle spaces around \( \) delimiters
    text = text.replace(/(\s+)\\\(([^)]+)\\\)(\s+)/g, '&nbsp;\\($2\\)&nbsp;');
    text = text.replace(/^(\s*)\\\(([^)]+)\\\)/gm, '&nbsp;\\($2\\)');
    text = text.replace(/\\\(([^)]+)\\\)(\s+)/g, '\\($1\\)&nbsp;');
    text = text.replace(/(\s+)\\\(([^)]+)\\\)$/gm, '&nbsp;\\($2\\)');
    
    // Handle spaces around \[ \] delimiters
    text = text.replace(/(\s+)\\\[([^\]]+)\\\](\s+)/g, '&nbsp;\\[$2\\]&nbsp;');
    text = text.replace(/^(\s*)\\\[([^\]]+)\\\]/gm, '&nbsp;\\[$2\\]');
    text = text.replace(/\\\[([^\]]+)\\\](\s+)/g, '\\[$1\\]&nbsp;');
    text = text.replace(/(\s+)\\\[([^\]]+)\\\]$/gm, '&nbsp;\\[$2\\]');
    
    return text;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeTestInterface();
});

function initializeTestInterface() {
    // Show load screen by default
    showScreen('loadScreen');
    
    // Set up drag and drop functionality
    setupDragAndDrop();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        hideFileInfo();
        return;
    }
    
    // Process the file using the shared logic
    processQuestionSetFile(file, () => {
        // Clear the file input on completion
        event.target.value = '';
    });
}

function validateQuestionSet(data) {
    return data && 
           data.metadata && 
           data.questions && 
           Array.isArray(data.questions) && 
           data.questions.length > 0 &&
           data.metadata.name &&
           data.metadata.subject;
}

function showFileInfo(data) {
    const fileInfo = document.getElementById('fileInfo');
    const fileDetails = document.getElementById('fileDetails');
    const testOptions = document.getElementById('testOptions');
    
    // Calculate total questions including question banks
    let totalQuestions = 0;
    data.questions.forEach(item => {
        if (item.type === 'questionBank') {
            totalQuestions += item.questionsToSelect;
        } else {
            totalQuestions += 1;
        }
    });
    
    fileDetails.innerHTML = `
        <strong>${data.metadata.name}</strong> - ${data.metadata.subject}<br>
        ${totalQuestions} questions • ${data.metadata.timeLimit} minutes
        ${data.metadata.allowAnswerChange ? '• Answer changes allowed' : '• No answer changes'}
    `;
    
    fileInfo.classList.remove('d-none');
    testOptions.classList.remove('d-none');
}

function hideFileInfo() {
    document.getElementById('fileInfo').classList.add('d-none');
    document.getElementById('testOptions').classList.add('d-none');
    document.getElementById('startTestBtn').disabled = true;
}

// Shared function to process question set files from either drag & drop or file input
function processQuestionSetFile(file, onComplete) {
    // Check file type
    if (file.type !== 'application/json' && !file.name.toLowerCase().endsWith('.json')) {
        showErrorMessage('Please select a valid JSON file.');
        hideFileInfo();
        if (onComplete) onComplete();
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (validateQuestionSet(data)) {
                originalQuestionSet = JSON.parse(JSON.stringify(data)); // Deep copy of original
                questionSet = data;
                showFileInfo(data);
                document.getElementById('startTestBtn').disabled = false;
            } else {
                showErrorMessage('Invalid question set format.');
                hideFileInfo();
            }
        } catch (error) {
            showErrorMessage('Error reading file: ' + error.message);
            hideFileInfo();
        } finally {
            if (onComplete) onComplete();
        }
    };
    reader.readAsText(file);
}

// Set up drag and drop functionality for file loading
function setupDragAndDrop() {
    const dragDropArea = document.getElementById('dragDropArea');
    const questionSetFile = document.getElementById('questionSetFile');
    const browseFileBtn = document.getElementById('browseFileBtn');
    
    if (!dragDropArea) return; // Exit if drag drop area doesn't exist
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dragDropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dragDropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dragDropArea.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    dragDropArea.addEventListener('drop', handleDrop, false);
    
    // Handle click to browse
    dragDropArea.addEventListener('click', function() {
        questionSetFile.click();
    });
    
    // Handle file selection via input
    questionSetFile.addEventListener('change', handleFileSelect);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        dragDropArea.classList.add('drag-over');
    }
    
    function unhighlight(e) {
        dragDropArea.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            
            // Set processing state
            setDragDropProcessing();
            
            // Process the file with callback to handle UI state
            processQuestionSetFile(file, () => {
                resetDragDropState();
            });
        }
    }
}

// Function to process question banks and generate the final question array
function processQuestionBanks(items) {
    const processedQuestions = [];
    
    items.forEach(item => {
        if (item.type === 'questionBank') {
            // This is a question bank - randomly select questions from it
            const bank = item;
            const availableQuestions = [...bank.questions]; // Create a copy
            const selectedQuestions = [];
            
            // Randomly select the specified number of questions
            for (let i = 0; i < Math.min(bank.questionsToSelect, availableQuestions.length); i++) {
                const randomIndex = Math.floor(Math.random() * availableQuestions.length);
                const selectedQuestion = availableQuestions.splice(randomIndex, 1)[0];
                selectedQuestions.push(selectedQuestion);
            }
            
            // Add selected questions to the processed array
            processedQuestions.push(...selectedQuestions);
        } else {
            // This is a regular question - add it directly
            processedQuestions.push(item);
        }
    });
    
    return processedQuestions;
}

// Function to shuffle answer choices while preserving questions with correct answer E
function shuffleAnswerChoices(questions) {
    return questions.map(question => {
        // Skip shuffling if the correct answer is E (these are intentionally structured)
        if (question.correctAnswer === 'E') {
            return question;
        }
        
        // Get only the choices that actually have content
        const availableChoices = ['A', 'B', 'C', 'D'].filter(choice => 
            question.options[choice] && question.options[choice].trim() !== ''
        );
        
        // If there are fewer than 2 choices, no need to shuffle
        if (availableChoices.length < 2) {
            return question;
        }
        
        // Create array of choice content in original order
        const choiceContents = availableChoices.map(choice => question.options[choice]);
        
        // Shuffle the content array
        const shuffledContents = [...choiceContents].sort(() => Math.random() - 0.5);
        
        // Create new options object
        const newOptions = { ...question.options };
        
        // Map shuffled content back to the available choices
        availableChoices.forEach((choice, index) => {
            newOptions[choice] = shuffledContents[index];
        });
        
        // Find the new correct answer by finding where the original correct content ended up
        const originalCorrectContent = question.options[question.correctAnswer];
        const newCorrectChoice = availableChoices.find(choice => 
            newOptions[choice] === originalCorrectContent
        );
        
        return {
            ...question,
            options: newOptions,
            correctAnswer: newCorrectChoice || question.correctAnswer
        };
    });
}

function startTest() {
    if (!originalQuestionSet) return;
    
    // Always process from the original question set to ensure fresh randomization
    const processedQuestions = processQuestionBanks(originalQuestionSet.questions);
    
    // Create a fresh copy of the question set with processed questions
    questionSet = JSON.parse(JSON.stringify(originalQuestionSet));
    questionSet.questions = processedQuestions;
    
    // Apply choice shuffling if enabled
    const shuffleChoices = document.getElementById('shuffleChoices').checked;
    if (shuffleChoices) {
        questionSet.questions = shuffleAnswerChoices(questionSet.questions);
    }
    
    // Initialize test data
    currentQuestionIndex = 0;
    userAnswers = {};
    testSubmitted = false;
    startTime = new Date();
    
    // Set up UI
    document.getElementById('testTitle').textContent = questionSet.metadata.name;
    document.getElementById('testSubject').textContent = questionSet.metadata.subject;
    document.getElementById('totalQuestionsScantron').textContent = questionSet.questions.length;
    
    // Update answer change status
    const answerChangeStatus = document.getElementById('answerChangeStatus');
    if (questionSet.metadata.allowAnswerChange) {
        answerChangeStatus.textContent = 'Allowed';
        answerChangeStatus.className = 'fw-bold text-success';
    } else {
        answerChangeStatus.textContent = 'Not Allowed';
        answerChangeStatus.className = 'fw-bold text-danger';
    }
    
    // Generate scantron grid
    generateScantronGrid();
    
    // Display all questions
    displayAllQuestions();
    
    // Start timer
    startTimer();
    
    // Switch to test screen
    showScreen('testScreen');
    
    showSuccessMessage('Test started! Good luck!');
}

function displayAllQuestions() {
    const container = document.getElementById('allQuestionsContainer');
    
    container.innerHTML = questionSet.questions.map((question, index) => {
        const options = Object.keys(question.options).filter(key => question.options[key]);
        
        return `
            <div class="exam-question" id="question-${index}">
                <div class="exam-question-header">
                    <div class="question-number ${userAnswers[index] ? 'answered' : ''}" id="qnum-${index}">
                        ${index + 1}
                    </div>
                    <div class="question-text" id="qtext-${index}">
                        ${preserveSpacesAroundLatex(question.question)}
                    </div>
                </div>
                <div id="noneOfAboveIndicator-${index}" class="alert alert-warning py-2 px-3 mb-2" style="display: none;">
                    <small>
                        <i class="fas fa-exclamation-triangle me-1"></i>
                        <strong>Note:</strong> You selected "E" - None of the above for this question.
                    </small>
                </div>
                <div class="answer-choices">
                    ${options.map(option => `
                        <div class="answer-choice ${userAnswers[index] === option ? 'selected' : ''}" 
                             id="choice-${index}-${option}">
                            <div class="choice-indicator">${option}</div>
                            <div class="choice-text" id="choice-text-${index}-${option}">
                                ${preserveSpacesAroundLatex(question.options[option])}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    // Render MathJax for all questions after DOM update
    if (window.MathJax) {
        MathJax.typesetPromise([container]).then(() => {
            console.log('MathJax rendering complete for all questions');
            // Fix alignment after rendering
            fixMathJaxAlignment(container);
        }).catch((err) => {
            console.error('MathJax rendering error:', err);
        });
    }
}

function selectAnswerFromExam(questionIndex, option) {
    if (testSubmitted) return;
    
    if (!questionSet.metadata.allowAnswerChange && userAnswers[questionIndex]) {
        showWarningMessage('Answer changes are not allowed for this test.');
        return;
    }
    
    selectAnswer(questionIndex, option);
    
    // Update the visual display of the selected answer
    updateQuestionDisplay(questionIndex);
}

function generateScantronGrid() {
    const grid = document.getElementById('scantronGrid');
    const questions = questionSet.questions;
    
    // Split questions into two columns
    const midpoint = Math.ceil(questions.length / 2);
    const column1Questions = questions.slice(0, midpoint);
    const column2Questions = questions.slice(midpoint);
    
    // Always show A-E options for proper scantron format
    const allOptions = ['A', 'B', 'C', 'D', 'E'];
    
    // Generate column 1
    let column1HTML = '<div class="scantron-column">';
    column1Questions.forEach((question, index) => {
        const qIndex = index;
        
        column1HTML += `
            <div class="scantron-question-row">
                <div class="scantron-question-number">Q${qIndex + 1}</div>
                <div class="scantron-options">
                    ${allOptions.map(option => {
                        const isSelected = userAnswers[qIndex] === option;
                        
                        return `
                            <div class="scantron-bubble ${isSelected ? 'selected' : ''}" 
                                 onclick="selectAnswerFromScantron(${qIndex}, '${option}')" 
                                 id="scantron-${qIndex}-${option}"
                                 title="Question ${qIndex + 1} - Option ${option}">
                                ${option}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });
    column1HTML += '</div>';
    
    // Generate column 2
    let column2HTML = '<div class="scantron-column">';
    column2Questions.forEach((question, index) => {
        const qIndex = midpoint + index;
        
        column2HTML += `
            <div class="scantron-question-row">
                <div class="scantron-question-number">Q${qIndex + 1}</div>
                <div class="scantron-options">
                    ${allOptions.map(option => {
                        const isSelected = userAnswers[qIndex] === option;
                        
                        return `
                            <div class="scantron-bubble ${isSelected ? 'selected' : ''}" 
                                 onclick="selectAnswerFromScantron(${qIndex}, '${option}')" 
                                 id="scantron-${qIndex}-${option}"
                                 title="Question ${qIndex + 1} - Option ${option}">
                                ${option}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });
    column2HTML += '</div>';
    
    grid.innerHTML = column1HTML + column2HTML;
}

function selectAnswerFromScantron(questionIndex, option) {
    if (testSubmitted) return;
    
    if (!questionSet.metadata.allowAnswerChange && userAnswers[questionIndex]) {
        showWarningMessage('Answer changes are not allowed for this test.');
        return;
    }
    
    selectAnswer(questionIndex, option);
    
    // Update the visual display of the selected answer in the exam
    updateQuestionDisplay(questionIndex);
}

function startTimer() {
    const timeLimit = questionSet.metadata.timeLimit * 60; // Convert to seconds
    let timeRemaining = timeLimit;
    
    updateTimerDisplay(timeRemaining);
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay(timeRemaining);
        
        // Warning when 5 minutes left
        if (timeRemaining === 300) {
            document.getElementById('timerDisplay').classList.add('timer-warning');
            showWarningMessage('5 minutes remaining!');
        }
        
        // Auto-submit when time runs out
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            showErrorMessage('Time\'s up! Test submitted automatically.');
            submitTest();
        }
    }, 1000);
}

function updateTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    document.getElementById('timeRemaining').textContent = display;
}

function updateQuestionDisplay(questionIndex) {
    const question = questionSet.questions[questionIndex];
    const options = Object.keys(question.options).filter(key => question.options[key]);
    
    // Update question number indicator
    const questionNumber = document.getElementById(`qnum-${questionIndex}`);
    if (questionNumber) {
        if (userAnswers[questionIndex]) {
            questionNumber.classList.add('answered');
        } else {
            questionNumber.classList.remove('answered');
        }
    }
    
    // Update answer choices
    options.forEach(option => {
        const choiceElement = document.getElementById(`choice-${questionIndex}-${option}`);
        if (choiceElement) {
            if (userAnswers[questionIndex] === option) {
                choiceElement.classList.add('selected');
            } else {
                choiceElement.classList.remove('selected');
            }
        }
    });
    
    // Update "none of the above" indicator for this specific question
    updateQuestionNoneOfAboveIndicator(questionIndex);
}

function selectAnswer(questionIndex, option) {
    if (testSubmitted || isShading) return;
    
    // Start shading simulation
    startShadingSimulation(questionIndex, option);
}

function startShadingSimulation(questionIndex, option) {
    isShading = true;
    
    // Show shading indicator
    showShadingIndicator(questionIndex, option);
    
    // Disable all interactions
    disableAllInteractions();
    
    // Set the answer immediately for visual feedback
    userAnswers[questionIndex] = option;
    
    // Update visual displays immediately
    updateScantronGrid();
    updateQuestionDisplay(questionIndex);
    
    // Show shading progress
    simulateShadingProgress(questionIndex, option);
    
    // Re-enable interactions after configured duration
    shadingTimeout = setTimeout(() => {
        completeShadingSimulation();
    }, SHADING_DURATION_SECONDS * 1000);
}

function showShadingIndicator(questionIndex, option) {
    // Create or update shading toast
    const shadingToast = document.getElementById('shadingToast');
    if (shadingToast) {
        shadingToast.remove();
    }
    
    const toastHtml = `
        <div class="toast align-items-center text-white bg-primary border-0 show" role="alert" id="shadingToast">
            <div class="d-flex">
                <div class="toast-body">
                    <div class="d-flex align-items-center">
                        <div class="spinner-border spinner-border-sm me-2" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <span>Shading Q${questionIndex + 1} - Option ${option}...</span>
                    </div>
                    <div class="progress mt-2" style="height: 4px;">
                        <div class="progress-bar" id="shadingProgress" role="progressbar" style="width: 0%"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '2000';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
}

function simulateShadingProgress(questionIndex, option) {
    const progressBar = document.getElementById('shadingProgress');
    if (!progressBar) return;
    
    let progress = 0;
    const totalDurationMs = SHADING_DURATION_SECONDS * 1000;
    const updateInterval = 100; // Update every 100ms
    const progressIncrement = (100 / totalDurationMs) * updateInterval;
    
    const progressInterval = setInterval(() => {
        progress += progressIncrement;
        progressBar.style.width = `${Math.min(progress, 100)}%`;
        
        if (progress >= 100) {
            clearInterval(progressInterval);
        }
    }, updateInterval);
}

function disableAllInteractions() {
    // Disable scantron bubbles
    const bubbles = document.querySelectorAll('.scantron-bubble');
    bubbles.forEach(bubble => {
        bubble.style.pointerEvents = 'none';
        bubble.style.opacity = '0.6';
    });
    
    // Disable answer choices
    const choices = document.querySelectorAll('.answer-choice');
    choices.forEach(choice => {
        choice.style.pointerEvents = 'none';
        choice.style.opacity = '0.6';
    });
    
    // Disable submit button
    const submitButtons = document.querySelectorAll('button[onclick="submitTest()"]');
    submitButtons.forEach(button => {
        button.disabled = true;
        button.style.opacity = '0.6';
    });
    
    // Show overlay on scantron modal if open
    const scantronModal = document.getElementById('scantronModal');
    if (scantronModal && scantronModal.classList.contains('show')) {
        const modalBody = scantronModal.querySelector('.modal-body');
        if (modalBody) {
            const overlay = document.createElement('div');
            overlay.id = 'shadingOverlay';
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.1);
                z-index: 1000;
                pointer-events: none;
            `;
            modalBody.style.position = 'relative';
            modalBody.appendChild(overlay);
        }
    }
}

function enableAllInteractions() {
    // Enable scantron bubbles
    const bubbles = document.querySelectorAll('.scantron-bubble');
    bubbles.forEach(bubble => {
        bubble.style.pointerEvents = 'auto';
        bubble.style.opacity = '1';
    });
    
    // Enable answer choices
    const choices = document.querySelectorAll('.answer-choice');
    choices.forEach(choice => {
        choice.style.pointerEvents = 'auto';
        choice.style.opacity = '1';
    });
    
    // Enable submit button
    const submitButtons = document.querySelectorAll('button[onclick="submitTest()"]');
    submitButtons.forEach(button => {
        button.disabled = false;
        button.style.opacity = '1';
    });
    
    // Remove overlay from scantron modal
    const overlay = document.getElementById('shadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

function completeShadingSimulation() {
    isShading = false;
    
    // Remove shading toast
    const shadingToast = document.getElementById('shadingToast');
    if (shadingToast) {
        shadingToast.remove();
    }
    
    // Re-enable all interactions
    enableAllInteractions();
    
    // Update progress and indicators
    updateProgress();
    updateNoneOfAboveIndicator();
    
    // Show completion feedback
    showToast('Answer recorded successfully!', 'success');
}

function updateScantronGrid() {
    const allOptions = ['A', 'B', 'C', 'D', 'E'];
    
    questionSet.questions.forEach((question, qIndex) => {
        allOptions.forEach(option => {
            const bubble = document.getElementById(`scantron-${qIndex}-${option}`);
            if (bubble) {
                bubble.classList.toggle('selected', userAnswers[qIndex] === option);
            }
        });
    });
}

function updateProgress() {
    const answered = Object.keys(userAnswers).length;
    const total = questionSet.questions.length;
    const percentage = (answered / total) * 100;
    
    document.getElementById('answeredCount').textContent = answered;
    document.getElementById('progressBar').style.width = `${percentage}%`;
}

function updateNoneOfAboveIndicator() {
    // Update the global indicator (keep for overall awareness)
    const globalIndicator = document.getElementById('noneOfAboveIndicator');
    let hasNoneOfAbove = false;
    
    // Check if any question with fewer than 5 options has E selected
    questionSet.questions.forEach((question, index) => {
        const questionOptions = Object.keys(question.options).filter(key => question.options[key]);
        const hasFewerThan5Options = questionOptions.length < 5;
        const selectedE = userAnswers[index] === 'E';
        
        if (hasFewerThan5Options && selectedE) {
            hasNoneOfAbove = true;
        }
        
        // Update individual question indicator
        updateQuestionNoneOfAboveIndicator(index);
    });
    
    // Show/hide global indicator based on whether E was selected as "none of the above"
    if (globalIndicator) {
        globalIndicator.style.display = hasNoneOfAbove ? 'block' : 'none';
    }
}

function updateQuestionNoneOfAboveIndicator(questionIndex) {
    const question = questionSet.questions[questionIndex];
    const questionOptions = Object.keys(question.options).filter(key => question.options[key]);
    const hasFewerThan5Options = questionOptions.length < 5;
    const selectedE = userAnswers[questionIndex] === 'E';
    
    const indicator = document.getElementById(`noneOfAboveIndicator-${questionIndex}`);
    if (indicator) {
        // Show indicator only if E was selected for a question with fewer than 5 options
        indicator.style.display = (hasFewerThan5Options && selectedE) ? 'block' : 'none';
    }
}

function toggleScantron() {
    const modal = new bootstrap.Modal(document.getElementById('scantronModal'));
    modal.show();
}

function submitTest() {
    if (testSubmitted) return;
    
    const answered = Object.keys(userAnswers).length;
    const total = questionSet.questions.length;
    
    if (answered < total) {
        if (!confirm(`You have only answered ${answered} out of ${total} questions. Are you sure you want to submit?`)) {
            return;
        }
    }
    
    testSubmitted = true;
    clearInterval(timerInterval);
    
    // Close scantron modal if it's open
    const scantronModal = document.getElementById('scantronModal');
    if (scantronModal && scantronModal.classList.contains('show')) {
        const modal = bootstrap.Modal.getInstance(scantronModal);
        if (modal) {
            modal.hide();
        }
    }
    
    // Calculate results
    const results = calculateResults();
    
    // Show results
    showResults(results);
    
    // Switch to results screen
    showScreen('resultsScreen');
}

function calculateResults() {
    let correct = 0;
    let incorrect = 0;
    const detailed = [];
    
    questionSet.questions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === question.correctAnswer;
        
        if (userAnswer) {
            if (isCorrect) {
                correct++;
            } else {
                incorrect++;
            }
        }
        
        detailed.push({
            questionNumber: index + 1,
            userAnswer: userAnswer || 'Not answered',
            correctAnswer: question.correctAnswer,
            isCorrect: isCorrect,
            wasAnswered: !!userAnswer
        });
    });
    
    const total = questionSet.questions.length;
    const score = Math.round((correct / total) * 100);
    
    return {
        correct,
        incorrect,
        unanswered: total - correct - incorrect,
        total,
        score,
        detailed
    };
}

function showResults(results) {
    document.getElementById('finalScore').textContent = `${results.score}%`;
    document.getElementById('correctCount').textContent = results.correct;
    document.getElementById('incorrectCount').textContent = results.incorrect;
    
    const detailedDiv = document.getElementById('detailedResults');
    detailedDiv.innerHTML = `
        <h6 class="mb-3">Detailed Results:</h6>
        <div class="table-responsive">
            <table class="table table-sm table-hover">
                <thead>
                    <tr>
                        <th>Question</th>
                        <th>Your Answer</th>
                        <th>Correct Answer</th>
                        <th>Result</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.detailed.map(item => `
                        <tr class="${item.isCorrect ? 'table-success' : (item.wasAnswered ? 'table-danger' : 'table-warning')}" 
                            style="cursor: pointer;" 
                            onclick="showQuestionDetails(${item.questionNumber - 1})"
                            title="Click to view question details">
                            <td>Q${item.questionNumber}</td>
                            <td>${item.userAnswer}</td>
                            <td>${item.correctAnswer}</td>
                            <td>
                                ${item.isCorrect ? '<i class="fas fa-check text-success"></i> Correct' : 
                                  (item.wasAnswered ? '<i class="fas fa-times text-danger"></i> Incorrect' : 
                                   '<i class="fas fa-minus text-warning"></i> Not answered')}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showQuestionDetails(questionIndex) {
    const question = questionSet.questions[questionIndex];
    const userAnswer = userAnswers[questionIndex];
    const correctAnswer = question.correctAnswer;
    const options = Object.keys(question.options).filter(key => question.options[key]);
    
    // Create modal HTML
    const modalHTML = `
        <div class="modal fade" id="questionDetailsModal" tabindex="-1" aria-labelledby="questionDetailsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="questionDetailsModalLabel">Question ${questionIndex + 1}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="exam-question">
                            <div class="exam-question-header">
                                <div class="question-number answered">
                                    ${questionIndex + 1}
                                </div>
                                <div class="question-text">
                                    ${preserveSpacesAroundLatex(question.question)}
                                </div>
                            </div>
                            <div class="answer-choices">
                                ${options.map(option => {
                                    let classes = 'answer-choice';
                                    let indicator = '';
                                    
                                    if (option === userAnswer && option === correctAnswer) {
                                        // User selected correct answer
                                        classes += ' selected correct-answer';
                                        indicator = '<i class="fas fa-check text-success ms-2"></i>';
                                    } else if (option === userAnswer) {
                                        // User selected wrong answer
                                        classes += ' selected incorrect-answer';
                                        indicator = '<i class="fas fa-times text-danger ms-2"></i>';
                                    } else if (option === correctAnswer) {
                                        // Correct answer not selected by user
                                        classes += ' correct-answer';
                                        indicator = '<i class="fas fa-check text-success ms-2"></i><span class="text-success fw-bold ms-1">Correct Answer</span>';
                                    }
                                    
                                    return `
                                        <div class="${classes}">
                                            <div class="choice-indicator">${option}</div>
                                            <div class="choice-text">
                                                ${preserveSpacesAroundLatex(question.options[option])}
                                                ${indicator}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            ${!userAnswer ? `
                                <div class="alert alert-warning mt-3">
                                    <i class="fas fa-exclamation-triangle me-2"></i>
                                    <strong>Not Answered:</strong> You did not select an answer for this question.
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('questionDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('questionDetailsModal'));
    modal.show();
    
    // Render MathJax for the modal content
    if (window.MathJax) {
        MathJax.typesetPromise([document.getElementById('questionDetailsModal')]).then(() => {
            console.log('MathJax rendering complete for question details modal');
            // Fix alignment after rendering
            fixMathJaxAlignment(document.getElementById('questionDetailsModal'));
        }).catch((err) => {
            console.error('MathJax rendering error in modal:', err);
        });
    }
}

function retakeTest() {
    if (confirm('Are you sure you want to retake this test? All previous answers will be lost.')) {
        startTest();
    }
}

function loadNewTest() {
    questionSet = null;
    originalQuestionSet = null;
    showScreen('loadScreen');
    document.getElementById('questionSetFile').value = '';
    hideFileInfo();
}

// Utility functions
function showScreen(screenId) {
    const screens = ['loadScreen', 'testScreen', 'resultsScreen'];
    screens.forEach(screen => {
        document.getElementById(screen).classList.add('d-none');
    });
    document.getElementById(screenId).classList.remove('d-none');
}

function showSuccessMessage(message) {
    showToast(message, 'success');
}

function showErrorMessage(message) {
    showToast(message, 'danger');
}

function showWarningMessage(message) {
    showToast(message, 'warning');
}

function showToast(message, type = 'info') {
    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div class="toast align-items-center text-white bg-${type} border-0" role="alert" id="${toastId}">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${getToastIcon(type)} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    // Add toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1060';
        document.body.appendChild(toastContainer);
    }
    
    // Add toast to container
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    // Initialize and show toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 4000 });
    toast.show();
    
    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

function getToastIcon(type) {
    const icons = {
        success: 'check-circle',
        danger: 'exclamation-triangle',
        info: 'info-circle',
        warning: 'exclamation-triangle'
    };
    return icons[type] || 'info-circle';
}

// Prevent accidental page refresh during test
window.addEventListener('beforeunload', function(e) {
    if (questionSet && !testSubmitted && Object.keys(userAnswers).length > 0) {
        e.preventDefault();
        e.returnValue = '';
        return 'You have unsaved answers. Are you sure you want to leave?';
    }
});

function showToast(message, type = 'primary') {
    const toastHtml = `
        <div class="toast align-items-center text-white bg-${type} border-0 show" role="alert" id="successToast">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '2000';
        document.body.appendChild(toastContainer);
    }
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = toastHtml;
    const toastElement = tempDiv.firstElementChild;
    toastContainer.appendChild(toastElement);
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
        toastElement.remove();
    }, 3000);
}

// Cleanup function for when the page is unloaded
window.addEventListener('beforeunload', () => {
    if (shadingTimeout) {
        clearTimeout(shadingTimeout);
    }
});

// Helper function to fix MathJax alignment after rendering
function fixMathJaxAlignment(container) {
    const mathJaxContainers = container.querySelectorAll('mjx-container');
    mathJaxContainers.forEach(mjxContainer => {
        // Force inline display for inline math
        if (!mjxContainer.hasAttribute('display') || mjxContainer.getAttribute('display') !== 'true') {
            mjxContainer.style.display = 'inline';
            mjxContainer.style.verticalAlign = 'baseline';
            mjxContainer.style.margin = '0';
            mjxContainer.style.padding = '0';
            
            // Also fix the SVG inside
            const svg = mjxContainer.querySelector('svg');
            if (svg) {
                svg.style.verticalAlign = 'baseline';
                svg.style.display = 'inline';
            }
            
            // Fix mjx-math elements
            const mjxMath = mjxContainer.querySelector('mjx-math');
            if (mjxMath) {
                mjxMath.style.verticalAlign = 'baseline';
            }
        }
    });
    
    // Also apply fixes to any math elements that might not be in containers
    const allMathElements = container.querySelectorAll('mjx-math, mjx-container svg');
    allMathElements.forEach(element => {
        element.style.verticalAlign = 'baseline';
        if (element.tagName.toLowerCase() === 'svg') {
            element.style.display = 'inline';
        }
    });
}

// Helper function to set drag drop processing state (no-op if not drag area)
function setDragDropProcessing() {
    const dragDropArea = document.getElementById('dragDropArea');
    if (!dragDropArea) return;
    
    dragDropArea.classList.remove('error', 'drag-over');
    dragDropArea.classList.add('processing');
    const icon = dragDropArea.querySelector('.drag-drop-icon');
    const text = dragDropArea.querySelector('.drag-drop-primary');
    if (icon) icon.className = 'fas fa-spinner fa-spin drag-drop-icon';
    if (text) text.textContent = 'Processing file...';
}

// Helper function to reset drag drop state (no-op if not drag area)
function resetDragDropState() {
    const dragDropArea = document.getElementById('dragDropArea');
    if (!dragDropArea) return;
    
    dragDropArea.classList.remove('processing', 'error', 'drag-over');
    const icon = dragDropArea.querySelector('.drag-drop-icon');
    const text = dragDropArea.querySelector('.drag-drop-primary');
    if (icon) icon.className = 'fas fa-cloud-upload-alt drag-drop-icon';
    if (text) text.textContent = 'Drop JSON file here';
}
