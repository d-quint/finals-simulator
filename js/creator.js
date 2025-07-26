// Question Creator JavaScript
let questions = [];
let currentQuestionIndex = 0;
let editingQuestionIndex = -1; // Track which question is being edited

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeCreator();
});

function initializeCreator() {
    // Set up real-time LaTeX preview for question
    const questionTextArea = document.getElementById('questionText');
    questionTextArea.addEventListener('input', updateLatexPreview);
    
    // Set up form submission
    const questionForm = document.getElementById('questionForm');
    questionForm.addEventListener('submit', handleQuestionSubmit);
    
    // Set up load questions functionality
    const loadQuestionsBtn = document.getElementById('loadQuestionsBtn');
    const loadQuestionFile = document.getElementById('loadQuestionFile');
    
    loadQuestionsBtn.addEventListener('click', function() {
        loadQuestionFile.click();
    });
    
    loadQuestionFile.addEventListener('change', handleLoadQuestions);
    
    // Set up LaTeX previews for all option inputs
    const optionInputs = ['optionA', 'optionB', 'optionC', 'optionD', 'optionE'];
    optionInputs.forEach(optionId => {
        const input = document.getElementById(optionId);
        const previewId = 'preview' + optionId.slice(-1); // Gets A, B, C, D, E
        
        input.addEventListener('input', function() {
            updateOptionPreview(optionId, previewId);
        });
    });
    
    // Generate default filename based on current date
    const now = new Date();
    const defaultFilename = `question-set-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    document.getElementById('exportFilename').value = defaultFilename;
    
    // Set up drag and drop functionality
    setupDragAndDrop();
}

function updateLatexPreview() {
    const questionText = document.getElementById('questionText').value;
    const previewDiv = document.getElementById('latexPreview');
    
    if (questionText.trim() === '') {
        previewDiv.innerHTML = '<em class="text-muted">Type in the question field to see preview</em>';
        return;
    }
    
    // Preserve spacing around LaTeX expressions
    const processedText = preserveSpacesAroundLatex(questionText);
    
    // Set the content and trigger MathJax rendering
    previewDiv.innerHTML = processedText;
    
    // Re-render MathJax for the new content
    if (window.MathJax) {
        MathJax.typesetPromise([previewDiv]).then(() => {
            // Fix alignment after rendering with a small delay to ensure completion
            setTimeout(() => {
                fixMathJaxAlignment(previewDiv);
            }, 50);
        }).catch((err) => {
            console.error('MathJax rendering error:', err);
        });
    }
}

function updateOptionPreview(inputId, previewId) {
    const inputText = document.getElementById(inputId).value;
    const previewDiv = document.getElementById(previewId);
    
    if (inputText.trim() === '') {
        const optionLetter = inputId.slice(-1); // Gets A, B, C, D, E
        previewDiv.innerHTML = `<em class="text-muted">Option ${optionLetter} preview</em>`;
        return;
    }
    
    // Preserve spacing around LaTeX expressions
    const processedText = preserveSpacesAroundLatex(inputText);
    
    // Set the content and trigger MathJax rendering
    previewDiv.innerHTML = processedText;
    
    // Re-render MathJax for the new content
    if (window.MathJax) {
        MathJax.typesetPromise([previewDiv]).then(() => {
            // Fix alignment after rendering with a small delay to ensure completion
            setTimeout(() => {
                fixMathJaxAlignment(previewDiv);
            }, 50);
        }).catch((err) => {
            console.error('MathJax rendering error:', err);
        });
    }
}

function handleQuestionSubmit(event) {
    event.preventDefault();
    
    const questionData = getQuestionFormData();
    
    if (validateQuestionData(questionData)) {
        if (editingQuestionIndex >= 0) {
            // Update existing question
            updateQuestionInList(editingQuestionIndex, questionData);
            showSuccessMessage('Question updated successfully!');
        } else {
            // Add new question
            addQuestionToList(questionData);
            showSuccessMessage('Question added successfully!');
        }
        clearForm();
        // Update the questions list again to remove any editing indicators
        updateQuestionsList();
    }
}

function getQuestionFormData() {
    return {
        id: Date.now(), // Simple ID generation
        question: document.getElementById('questionText').value.trim(),
        options: {
            A: document.getElementById('optionA').value.trim(),
            B: document.getElementById('optionB').value.trim(),
            C: document.getElementById('optionC').value.trim(),
            D: document.getElementById('optionD').value.trim(),
            E: document.getElementById('optionE').value.trim()
        },
        correctAnswer: document.getElementById('correctAnswer').value,
        createdAt: new Date().toISOString()
    };
}

function validateQuestionData(data) {
    if (!data.question) {
        showErrorMessage('Please enter a question.');
        return false;
    }
    
    if (!data.options.A || !data.options.B || !data.options.C || !data.options.D) {
        showErrorMessage('Please fill in at least options A, B, C, and D.');
        return false;
    }
    
    if (!data.correctAnswer) {
        showErrorMessage('Please select the correct answer.');
        return false;
    }
    
    // Check if the selected correct answer has a corresponding option
    if (!data.options[data.correctAnswer]) {
        showErrorMessage('The selected correct answer option is empty.');
        return false;
    }
    
    return true;
}

function addQuestionToList(questionData) {
    questions.push(questionData);
    updateQuestionsList();
    updateQuestionCount();
}

function updateQuestionInList(index, questionData) {
    // Preserve the original ID and creation time if they exist
    if (questions[index]) {
        questionData.id = questions[index].id;
        questionData.createdAt = questions[index].createdAt;
    }
    questions[index] = questionData;
    updateQuestionsList();
    updateQuestionCount();
}

function updateQuestionsList() {
    const questionsList = document.getElementById('questionsList');
    
    if (questions.length === 0) {
        questionsList.innerHTML = `
            <div class="list-group-item text-center text-muted py-4">
                <i class="fas fa-clipboard-list fa-2x mb-2"></i>
                <p class="mb-0">No questions added yet</p>
            </div>
        `;
        return;
    }
    
    questionsList.innerHTML = questions.map((question, index) => {
        const shortQuestion = question.question.length > 50 
            ? question.question.substring(0, 50) + '...' 
            : question.question;
        
        const isBeingEdited = editingQuestionIndex === index;
        const itemClass = isBeingEdited ? 'list-group-item question-item border-warning bg-warning-light bg-opacity-10' : 'list-group-item question-item';
        
        return `
            <div class="${itemClass}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1 fw-bold">
                            Question ${index + 1}
                            ${isBeingEdited ? '<span class="badge bg-light text-dark ms-2">Editing</span>' : ''}
                        </h6>
                        <p class="mb-1 small">${escapeHtml(shortQuestion)}</p>
                        <small class="text-muted">
                            <i class="fas fa-check-circle text-success me-1"></i>
                            Answer: ${question.correctAnswer}
                        </small>
                    </div>
                    <div class="btn-group-vertical btn-group-sm ms-2">
                        <button class="btn btn-outline-primary btn-sm" onclick="editQuestion(${index})" title="Edit" ${isBeingEdited ? 'disabled' : ''}>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteQuestion(${index})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateQuestionCount() {
    document.getElementById('questionCount').textContent = questions.length;
}

function editQuestion(index) {
    const question = questions[index];
    
    // Set editing mode
    editingQuestionIndex = index;
    
    // Update the questions list to show editing indicator
    updateQuestionsList();
    
    // Populate form with question data
    document.getElementById('questionText').value = question.question;
    document.getElementById('optionA').value = question.options.A;
    document.getElementById('optionB').value = question.options.B;
    document.getElementById('optionC').value = question.options.C;
    document.getElementById('optionD').value = question.options.D;
    document.getElementById('optionE').value = question.options.E || '';
    document.getElementById('correctAnswer').value = question.correctAnswer;
    
    // Update question LaTeX preview
    updateLatexPreview();
    
    // Update all option previews
    updateOptionPreview('optionA', 'previewA');
    updateOptionPreview('optionB', 'previewB');
    updateOptionPreview('optionC', 'previewC');
    updateOptionPreview('optionD', 'previewD');
    updateOptionPreview('optionE', 'previewE');
    
    // Force fix alignment for all previews after a short delay
    setTimeout(() => {
        fixAllPreviewAlignments();
    }, 100);
    
    // Update form button text to indicate editing mode
    const submitButton = document.querySelector('#questionForm button[type="submit"]');
    submitButton.textContent = 'Update Question';
    submitButton.className = 'btn btn-success';
    
    // Scroll to form
    document.getElementById('questionForm').scrollIntoView({ behavior: 'smooth' });
    
    showInfoMessage('Question loaded for editing. Make changes and click "Update Question" to save.');
}

function deleteQuestion(index) {
    if (confirm('Are you sure you want to delete this question?')) {
        // If we're editing the question being deleted, reset editing state
        if (editingQuestionIndex === index) {
            clearForm();
        } else if (editingQuestionIndex > index) {
            // If we're editing a question after the deleted one, adjust the index
            editingQuestionIndex--;
        }
        
        questions.splice(index, 1);
        updateQuestionsList();
        updateQuestionCount();
        showSuccessMessage('Question deleted successfully.');
    }
}

function clearForm() {
    document.getElementById('questionForm').reset();
    document.getElementById('latexPreview').innerHTML = '<em class="text-muted">Type in the question field to see preview</em>';
    
    // Clear all option previews
    const options = ['A', 'B', 'C', 'D', 'E'];
    options.forEach(option => {
        const previewDiv = document.getElementById(`preview${option}`);
        if (previewDiv) {
            previewDiv.innerHTML = `<em class="text-muted">Option ${option} preview</em>`;
        }
    });
    
    // Reset editing state
    editingQuestionIndex = -1;
    
    // Reset form button to default state
    const submitButton = document.querySelector('#questionForm button[type="submit"]');
    submitButton.textContent = 'Add Question';
    submitButton.className = 'btn btn-primary';
}

function clearAllQuestions() {
    if (questions.length === 0) {
        showInfoMessage('No questions to clear.');
        return;
    }
    
    if (confirm(`Are you sure you want to delete all ${questions.length} questions?`)) {
        questions = [];
        updateQuestionsList();
        updateQuestionCount();
        showSuccessMessage('All questions cleared.');
    }
}

function exportQuestionSet() {
    if (questions.length === 0) {
        showErrorMessage('No questions to export. Please add some questions first.');
        return;
    }
    
    const configData = getConfigurationData();
    if (!validateConfiguration(configData)) {
        return;
    }
    
    const exportModal = new bootstrap.Modal(document.getElementById('exportModal'));
    exportModal.show();
}

function getConfigurationData() {
    return {
        name: document.getElementById('questionSetName').value.trim(),
        subject: document.getElementById('subject').value.trim(),
        timeLimit: parseInt(document.getElementById('timeLimit').value) || 60,
        allowAnswerChange: document.getElementById('allowAnswerChange').value === 'true'
    };
}

function validateConfiguration(config) {
    if (!config.name) {
        showErrorMessage('Please enter a question set name.');
        document.getElementById('questionSetName').focus();
        return false;
    }
    
    if (!config.subject) {
        showErrorMessage('Please enter a subject.');
        document.getElementById('subject').focus();
        return false;
    }
    
    return true;
}

function downloadQuestionSet() {
    const config = getConfigurationData();
    const filename = document.getElementById('exportFilename').value.trim() || 'question-set';
    
    const questionSet = {
        metadata: {
            ...config,
            totalQuestions: questions.length,
            createdAt: new Date().toISOString(),
            version: '1.0'
        },
        questions: questions
    };
    
    // Create and download the JSON file
    const jsonString = JSON.stringify(questionSet, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Close modal and show success message
    const exportModal = bootstrap.Modal.getInstance(document.getElementById('exportModal'));
    exportModal.hide();
    
    showSuccessMessage(`Question set exported successfully as ${filename}.json`);
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSuccessMessage(message) {
    showToast(message, 'success');
}

function showErrorMessage(message) {
    showToast(message, 'danger');
}

function showInfoMessage(message) {
    showToast(message, 'info');
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

// Handle loading existing question sets
function handleLoadQuestions(event) {
    const fileInput = event.target;
    const file = fileInput.files[0];
    
    if (!file) {
        return; // No file selected
    }
    
    // Process the file using the same logic as drag and drop
    processQuestionFile(file, () => {
        // Clear the file input on completion
        fileInput.value = '';
    });
}

// Shared function to process question files from either drag & drop or file input
function processQuestionFile(file, onComplete) {
    // Check file type
    if (file.type !== 'application/json' && !file.name.toLowerCase().endsWith('.json')) {
        showErrorMessage('Please select a valid JSON question set file.');
        setDragDropError();
        if (onComplete) onComplete();
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jsonData = JSON.parse(e.target.result);
            
            // Validate the JSON structure
            if (!jsonData.metadata || !jsonData.questions || !Array.isArray(jsonData.questions)) {
                throw new Error('Invalid question set format. Please select a valid question set file.');
            }
            
            // Load metadata into the configuration form
            loadMetadata(jsonData.metadata);
            
            // Load questions into the questions array
            questions = [...jsonData.questions];
            
            // Update the questions list display
            updateQuestionsList();
            updateQuestionCount();
            
            // Show success message
            const loadStatus = document.getElementById('loadStatus');
            const alertDiv = loadStatus.querySelector('.alert');
            alertDiv.className = 'alert alert-success alert-sm mb-0 py-2';
            alertDiv.innerHTML = `<i class="fas fa-check-circle me-2"></i><span>Loaded ${questions.length} questions from "${jsonData.metadata.name || 'Unknown'}"</span>`;
            loadStatus.style.display = 'block';
            
            showSuccessMessage(`Question set loaded successfully! ${questions.length} questions imported.`);
            
        } catch (error) {
            console.error('Error loading question set:', error);
            showErrorMessage(`Error loading question set: ${error.message}`);
            setDragDropError();
            
            // Show error in load status
            const loadStatus = document.getElementById('loadStatus');
            const alertDiv = loadStatus.querySelector('.alert');
            alertDiv.className = 'alert alert-danger alert-sm mb-0 py-2';
            alertDiv.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i><span>Error: ${error.message}</span>`;
            loadStatus.style.display = 'block';
        } finally {
            if (onComplete) onComplete();
        }
    };
    
    reader.readAsText(file);
}

// Helper function to set drag drop error state (no-op if not drag area)
function setDragDropError() {
    const dragDropArea = document.getElementById('dragDropArea');
    if (!dragDropArea) return;
    
    dragDropArea.classList.remove('processing', 'drag-over');
    dragDropArea.classList.add('error');
    const icon = dragDropArea.querySelector('.drag-drop-icon');
    const text = dragDropArea.querySelector('.drag-drop-primary');
    if (icon) icon.className = 'fas fa-exclamation-triangle drag-drop-icon';
    if (text) text.textContent = 'Error loading file';
    
    // Reset after 3 seconds
    setTimeout(() => {
        resetDragDropState();
    }, 3000);
}

// Helper function to preserve spaces around LaTeX expressions
function preserveSpacesAroundLatex(text) {
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

// Load metadata into form fields
function loadMetadata(metadata) {
    if (metadata.name) {
        document.getElementById('questionSetName').value = metadata.name;
    }
    if (metadata.subject) {
        document.getElementById('subject').value = metadata.subject;
    }
    if (metadata.timeLimit) {
        document.getElementById('timeLimit').value = metadata.timeLimit;
    }
    if (metadata.allowAnswerChange !== undefined) {
        document.getElementById('allowAnswerChange').value = metadata.allowAnswerChange.toString();
    }
}

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

// Helper function to fix alignment in all preview areas
function fixAllPreviewAlignments() {
    const previewIds = ['latexPreview', 'previewA', 'previewB', 'previewC', 'previewD', 'previewE'];
    previewIds.forEach(previewId => {
        const previewDiv = document.getElementById(previewId);
        if (previewDiv) {
            fixMathJaxAlignment(previewDiv);
        }
    });
}

// Set up drag and drop functionality for file loading
function setupDragAndDrop() {
    const dragDropArea = document.getElementById('dragDropArea');
    const loadQuestionFile = document.getElementById('loadQuestionFile');
    const loadQuestionsBtn = document.getElementById('loadQuestionsBtn');
    
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
        loadQuestionFile.click();
    });
    
    // Handle file selection via input
    loadQuestionFile.addEventListener('change', handleLoadQuestions);
    
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
            processQuestionFile(file, () => {
                resetDragDropState();
            });
        }
    }
    
    function resetDragDropState() {
        dragDropArea.classList.remove('processing', 'error', 'drag-over');
        const icon = dragDropArea.querySelector('.drag-drop-icon');
        const text = dragDropArea.querySelector('.drag-drop-primary');
        icon.className = 'fas fa-cloud-upload-alt drag-drop-icon';
        text.textContent = 'Drop JSON file here';
    }
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
