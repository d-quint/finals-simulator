// Question Creator JavaScript
let questions = [];
let currentQuestionIndex = 0;
let editingQuestionIndex = -1; // Track which question is being edited
let currentBankIndex = -1; // Track which question bank is being edited
let editingBankQuestionIndex = -1; // Track which question within a bank is being edited

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
    
    // Preserve spacing around LaTeX expressions and line breaks
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
    
    // Preserve spacing around LaTeX expressions and line breaks
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
            // Update existing regular question
            updateQuestionInList(editingQuestionIndex, questionData);
            showSuccessMessage('Question updated successfully!');
        } else if (currentBankIndex >= 0 && editingBankQuestionIndex >= 0) {
            // Update existing bank question
            const bank = questions[currentBankIndex];
            bank.questions[editingBankQuestionIndex] = questionData;
            showSuccessMessage('Bank question updated successfully!');
        } else if (currentBankIndex >= 0) {
            // Add new question to bank
            const bank = questions[currentBankIndex];
            bank.questions.push(questionData);
            showSuccessMessage('Question added to bank successfully!');
        } else {
            // Add new regular question
            addQuestionToList(questionData);
            showSuccessMessage('Question added successfully!');
        }
        clearForm();
        resetEditingMode();
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
    
    // Check if at least one option is filled
    const hasAtLeastOneOption = data.options.A || data.options.B || data.options.C || data.options.D || data.options.E;
    if (!hasAtLeastOneOption) {
        showErrorMessage('Please fill in at least one answer option.');
        return false;
    }
    
    if (!data.correctAnswer) {
        showErrorMessage('Please select the correct answer.');
        return false;
    }
    
    // Check if the selected correct answer has a corresponding option
    // Allow E to be empty (for "None of the above" type questions)
    if (!data.options[data.correctAnswer] && data.correctAnswer !== 'E') {
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
        updateQuestionCount();
        return;
    }
    
    let html = '';
    let questionNumber = 1;
    
    questions.forEach((item, index) => {
        if (item.type === 'questionBank') {
            // Render question bank
            const bank = item;
            const currentQuestionNumber = questionNumber;
            questionNumber += bank.questionsToSelect;
            
            const isBeingEdited = currentBankIndex === index && editingBankQuestionIndex === -1;
            const itemClass = isBeingEdited ? 'list-group-item question-bank-item border-warning bg-warning-light bg-opacity-10 draggable-item' : 'list-group-item question-bank-item draggable-item';
            
            html += `
                <div class="${itemClass}" draggable="true" data-index="${index}" data-type="bank">
                    <div class="bank-header">
                        <div class="drag-handle" title="Drag to reorder">
                            <i class="fas fa-grip-vertical text-muted"></i>
                        </div>
                        <div class="bank-info">
                            <div class="bank-name">
                                <i class="fas fa-database me-1"></i>
                                Q${currentQuestionNumber}-${currentQuestionNumber + bank.questionsToSelect - 1}: ${escapeHtml(bank.name)}
                                ${isBeingEdited ? '<span class="badge bg-light text-dark ms-2">Editing Bank</span>' : ''}
                            </div>
                            <div class="bank-stats">
                                ${bank.questionsToSelect} random from ${bank.questions.length} questions
                            </div>
                        </div>
                        <div class="bank-controls">
                            <button class="btn btn-sm btn-outline-info" onclick="toggleBankMinimize(${index})" title="Minimize/Expand Bank">
                                <i class="fas ${bank.minimized === true ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary" onclick="editBankName(${index})" title="Edit Bank">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="duplicateQuestion(${index})" title="Duplicate Bank">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteQuestion(${index})" title="Delete Bank">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Always render the container for animation, but add minimized class if needed
            // Handle backwards compatibility for banks without minimized property
            const isMinimized = bank.minimized === true;
            const containerClass = isMinimized ? 'bank-questions-container minimized' : 'bank-questions-container';
            html += `<div class="${containerClass}">`;
            
            // Render bank questions
            bank.questions.forEach((question, qIndex) => {
                const shortQuestion = question.question.length > 50 
                    ? question.question.substring(0, 50) + '...' 
                    : question.question;
                
                const isBeingEdited = currentBankIndex === index && editingBankQuestionIndex === qIndex;
                const itemClass = isBeingEdited ? 'list-group-item bank-question-item border-warning bg-warning-light bg-opacity-10 draggable-item' : 'list-group-item bank-question-item draggable-item';
                
                // Use simple 1-based numbering within the bank
                const bankQuestionNumber = qIndex + 1;
                
                html += `
                    <div class="${itemClass}" draggable="true" data-index="${index}" data-question-index="${qIndex}" data-type="bank-question">
                        <div class="d-flex align-items-center">
                            <div class="drag-handle me-3" title="Drag to reorder">
                                <i class="fas fa-grip-vertical text-muted"></i>
                            </div>
                            <div class="flex-grow-1 py-2">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <h6 class="mb-0 fw-bold">
                                        Question ${bankQuestionNumber}
                                        ${isBeingEdited ? '<span class="badge bg-light text-dark ms-2">Editing</span>' : ''}
                                    </h6>
                                    <small class="text-muted">
                                        <i class="fas fa-check-circle text-success me-1"></i>
                                        Answer: ${question.correctAnswer}
                                    </small>
                                </div>
                                <p class="mb-0 small text-break">${escapeHtml(shortQuestion)}</p>
                            </div>
                            <div class="btn-group-vertical btn-group-sm ms-3">
                                <button class="btn btn-outline-primary btn-sm" onclick="editBankQuestion(${index}, ${qIndex})" title="Edit" ${isBeingEdited ? 'disabled' : ''}>
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-outline-secondary btn-sm" onclick="duplicateBankQuestion(${index}, ${qIndex})" title="Duplicate">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="deleteBankQuestion(${index}, ${qIndex})" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += `</div>`; // Close bank-questions-container
            
        } else {
            // Render regular question
            const question = item;
            const currentQuestionNumber = questionNumber++;
            
            const shortQuestion = question.question.length > 50 
                ? question.question.substring(0, 50) + '...' 
                : question.question;
            
            const isBeingEdited = editingQuestionIndex === index;
            const itemClass = isBeingEdited ? 'list-group-item question-item border-warning bg-warning-light bg-opacity-10 draggable-item' : 'list-group-item question-item draggable-item';
            
            html += `
                <div class="${itemClass}" draggable="true" data-index="${index}" data-type="question">
                    <div class="d-flex align-items-center">
                        <div class="drag-handle me-3" title="Drag to reorder">
                            <i class="fas fa-grip-vertical text-muted"></i>
                        </div>
                        <div class="flex-grow-1 py-2">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="mb-0 fw-bold">
                                    Question ${currentQuestionNumber}
                                    ${isBeingEdited ? '<span class="badge bg-light text-dark ms-2">Editing</span>' : ''}
                                </h6>
                                <small class="text-muted">
                                    <i class="fas fa-check-circle text-success me-1"></i>
                                    Answer: ${question.correctAnswer}
                                </small>
                            </div>
                            <p class="mb-0 small text-break">${escapeHtml(shortQuestion)}</p>
                        </div>
                        <div class="btn-group-vertical btn-group-sm ms-3">
                            <button class="btn btn-outline-primary btn-sm" onclick="editQuestion(${index})" title="Edit" ${isBeingEdited ? 'disabled' : ''}>
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="duplicateQuestion(${index})" title="Duplicate">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteQuestion(${index})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    });
    
    questionsList.innerHTML = html;
    updateQuestionCount();
    
    // Set up drag and drop functionality for reordering
    setupQuestionDragAndDrop();
}

function updateQuestionCount() {
    let totalQuestions = 0;
    questions.forEach(item => {
        if (item.type === 'questionBank') {
            totalQuestions += item.questionsToSelect;
        } else {
            totalQuestions += 1;
        }
    });
    document.getElementById('questionCount').textContent = totalQuestions;
}

function editQuestion(index) {
    const item = questions[index];
    
    // Only allow editing regular questions, not question banks
    if (item.type === 'questionBank') {
        showErrorMessage('Use the "Manage Bank" button to edit question banks.');
        return;
    }
    
    const question = item;
    
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
    const item = questions[index];
    
    // Handle question banks differently
    if (item.type === 'questionBank') {
        deleteQuestionBank(index);
        return;
    }
    
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

function duplicateQuestion(index) {
    const originalItem = questions[index];
    
    // Handle question banks differently
    if (originalItem.type === 'questionBank') {
        duplicateQuestionBank(index);
        return;
    }
    
    const originalQuestion = originalItem;
    
    // Create a deep copy of the question
    const duplicatedQuestion = {
        id: Date.now(), // New unique ID
        question: originalQuestion.question,
        options: {
            A: originalQuestion.options.A,
            B: originalQuestion.options.B,
            C: originalQuestion.options.C,
            D: originalQuestion.options.D,
            E: originalQuestion.options.E || ''
        },
        correctAnswer: originalQuestion.correctAnswer,
        createdAt: new Date().toISOString()
    };
    
    // Insert the duplicated question right after the original
    questions.splice(index + 1, 0, duplicatedQuestion);
    
    // Update the display
    updateQuestionsList();
    updateQuestionCount();
    
    // Automatically edit the duplicated question
    editQuestion(index + 1);
    
    showSuccessMessage('Question duplicated successfully! Edit the copy as needed.');
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

// Set up drag and drop functionality for question reordering
function setupQuestionDragAndDrop() {
    const questionsList = document.getElementById('questionsList');
    if (!questionsList) return;
    
    const draggableItems = questionsList.querySelectorAll('.draggable-item');
    let draggedElement = null;
    let draggedIndex = null;
    let draggedType = null;
    let draggedQuestionIndex = null;
    
    // Set up drop zone for the entire questions list area
    questionsList.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // If dragging over empty space or between items
        if (!e.target.closest('.draggable-item') && draggedType === 'bank-question') {
            this.classList.add('drop-zone-active');
        }
    });
    
    questionsList.addEventListener('dragleave', function(e) {
        // Only remove if we're actually leaving the questions list
        if (!this.contains(e.relatedTarget)) {
            this.classList.remove('drop-zone-active');
        }
    });
    
    questionsList.addEventListener('drop', function(e) {
        e.preventDefault();
        
        // Handle dropping bank question on empty space (move to end of main list)
        if (!e.target.closest('.draggable-item') && draggedType === 'bank-question') {
            moveBankQuestionToMainList(draggedIndex, draggedQuestionIndex, questions.length);
        }
        
        this.classList.remove('drop-zone-active');
    });
    
    draggableItems.forEach((item, index) => {
        // Drag start
        item.addEventListener('dragstart', function(e) {
            draggedElement = this;
            draggedIndex = parseInt(this.dataset.index);
            draggedType = this.dataset.type;
            draggedQuestionIndex = this.dataset.questionIndex ? parseInt(this.dataset.questionIndex) : null;
            this.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.outerHTML);
        });
        
        // Drag end
        item.addEventListener('dragend', function(e) {
            this.style.opacity = '';
            draggedElement = null;
            draggedIndex = null;
            draggedType = null;
            draggedQuestionIndex = null;
            
            // Remove all drag indicators
            const allItems = questionsList.querySelectorAll('.draggable-item');
            allItems.forEach(item => {
                item.classList.remove('drag-over-top', 'drag-over-bottom', 'drop-zone-active');
            });
            questionsList.classList.remove('drop-zone-active');
        });
        
        // Drag over
        item.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (draggedElement !== this) {
                const rect = this.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                
                // Remove previous indicators
                this.classList.remove('drag-over-top', 'drag-over-bottom', 'drop-zone-active');
                
                // Special handling for dropping onto question banks
                if (this.dataset.type === 'bank' && draggedType === 'question') {
                    this.classList.add('drop-zone-active');
                } else {
                    // Add appropriate indicator for reordering
                    if (e.clientY < midpoint) {
                        this.classList.add('drag-over-top');
                    } else {
                        this.classList.add('drag-over-bottom');
                    }
                }
            }
        });
        
        // Drag leave
        item.addEventListener('dragleave', function(e) {
            // Only remove if we're actually leaving this element
            if (!this.contains(e.relatedTarget)) {
                this.classList.remove('drag-over-top', 'drag-over-bottom', 'drop-zone-active');
            }
        });
        
        // Drop
        item.addEventListener('drop', function(e) {
            e.preventDefault();
            
            if (draggedElement !== this && draggedIndex !== null) {
                const targetIndex = parseInt(this.dataset.index);
                
                // Handle dropping a regular question onto a question bank
                if (this.dataset.type === 'bank' && draggedType === 'question') {
                    // Move question into the bank
                    moveQuestionToBank(draggedIndex, targetIndex);
                } else if (draggedType === 'bank-question' && this.dataset.type === 'bank-question') {
                    // Handle reordering within the same bank or moving between banks
                    const targetBankIndex = parseInt(this.dataset.index);
                    const targetQuestionIndex = parseInt(this.dataset.questionIndex);
                    
                    if (draggedIndex === targetBankIndex) {
                        // Reordering within the same bank
                        const rect = this.getBoundingClientRect();
                        const midpoint = rect.top + rect.height / 2;
                        
                        let newIndex;
                        if (e.clientY < midpoint) {
                            // Drop above
                            newIndex = targetQuestionIndex;
                        } else {
                            // Drop below
                            newIndex = targetQuestionIndex + 1;
                        }
                        
                        // Adjust for the item being removed
                        if (draggedQuestionIndex < newIndex) {
                            newIndex--;
                        }
                        
                        if (draggedQuestionIndex !== newIndex) {
                            reorderWithinBank(draggedIndex, draggedQuestionIndex, newIndex);
                        }
                    } else {
                        // Moving to a different bank
                        moveBankQuestionToBank(draggedIndex, draggedQuestionIndex, targetBankIndex);
                    }
                } else if (draggedType === 'bank-question' && this.dataset.type === 'bank') {
                    // Move bank question to different bank
                    moveBankQuestionToBank(draggedIndex, draggedQuestionIndex, targetIndex);
                } else if (draggedType === 'bank-question' && (this.dataset.type === 'question' || this.dataset.type === 'bank')) {
                    // Move bank question out to main questions list
                    const rect = this.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;
                    
                    let newIndex;
                    if (e.clientY < midpoint) {
                        // Drop above
                        newIndex = targetIndex;
                    } else {
                        // Drop below
                        newIndex = targetIndex + 1;
                    }
                    
                    moveBankQuestionToMainList(draggedIndex, draggedQuestionIndex, newIndex);
                } else {
                    // Regular reordering
                    const rect = this.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;
                    
                    let newIndex;
                    if (e.clientY < midpoint) {
                        // Drop above
                        newIndex = targetIndex;
                    } else {
                        // Drop below
                        newIndex = targetIndex + 1;
                    }
                    
                    // Adjust for the item being removed
                    if (draggedIndex < newIndex) {
                        newIndex--;
                    }
                    
                    // Perform the reorder
                    if (draggedType === 'question' || draggedType === 'bank') {
                        reorderQuestion(draggedIndex, newIndex);
                    } else if (draggedType === 'bank-question') {
                        reorderBankQuestion(draggedIndex, draggedQuestionIndex, newIndex);
                    }
                }
            }
            
            this.classList.remove('drag-over-top', 'drag-over-bottom', 'drop-zone-active');
        });
    });
}

// Function to reorder questions
function reorderQuestion(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    
    // Adjust editing index if necessary
    if (editingQuestionIndex === fromIndex) {
        editingQuestionIndex = toIndex;
    } else if (editingQuestionIndex > fromIndex && editingQuestionIndex <= toIndex) {
        editingQuestionIndex--;
    } else if (editingQuestionIndex < fromIndex && editingQuestionIndex >= toIndex) {
        editingQuestionIndex++;
    }
    
    // Move the question
    const movedQuestion = questions.splice(fromIndex, 1)[0];
    questions.splice(toIndex, 0, movedQuestion);
    
    // Update the display
    updateQuestionsList();
}

// Function to move a regular question into a question bank
function moveQuestionToBank(questionIndex, bankIndex) {
    const question = questions[questionIndex];
    const bank = questions[bankIndex];
    
    // Only allow moving regular questions to banks
    if (question.type === 'questionBank' || bank.type !== 'questionBank') return;
    
    // Remove question from main array
    questions.splice(questionIndex, 1);
    
    // Add to bank
    bank.questions.push(question);
    
    // Adjust editing index if necessary
    if (editingQuestionIndex === questionIndex) {
        resetEditingMode();
    } else if (editingQuestionIndex > questionIndex) {
        editingQuestionIndex--;
    }
    
    updateQuestionsList();
    showSuccessMessage(`Question moved to "${bank.name}" bank successfully!`);
}

// Function to move a bank question to a different bank
function moveBankQuestionToBank(sourceBankIndex, questionIndex, targetBankIndex) {
    const sourceBank = questions[sourceBankIndex];
    const targetBank = questions[targetBankIndex];
    
    if (sourceBank.type !== 'questionBank' || targetBank.type !== 'questionBank') return;
    if (sourceBankIndex === targetBankIndex) return;
    
    // Get the question
    const question = sourceBank.questions[questionIndex];
    
    // Remove from source bank
    sourceBank.questions.splice(questionIndex, 1);
    
    // Add to target bank
    targetBank.questions.push(question);
    
    // Clear editing mode if we were editing this question
    if (currentBankIndex === sourceBankIndex && editingBankQuestionIndex === questionIndex) {
        resetEditingMode();
    }
    
    updateQuestionsList();
    showSuccessMessage(`Question moved to "${targetBank.name}" bank successfully!`);
}

// Function to move a bank question to the main questions list
function moveBankQuestionToMainList(bankIndex, questionIndex, targetIndex) {
    const bank = questions[bankIndex];
    
    if (bank.type !== 'questionBank') return;
    
    // Get the question
    const question = bank.questions[questionIndex];
    
    // Remove from bank
    bank.questions.splice(questionIndex, 1);
    
    // Insert into main questions list at target position
    questions.splice(targetIndex, 0, question);
    
    // Clear editing mode if we were editing this question
    if (currentBankIndex === bankIndex && editingBankQuestionIndex === questionIndex) {
        resetEditingMode();
    }
    
    updateQuestionsList();
    showSuccessMessage('Question moved to main list successfully!');
}

// Function to reorder bank questions (within the same bank or between banks)
function reorderBankQuestion(bankIndex, questionIndex, newPosition) {
    // This function is deprecated - use reorderWithinBank instead
    updateQuestionsList();
}

// Function to reorder questions within the same bank
function reorderWithinBank(bankIndex, fromIndex, toIndex) {
    const bank = questions[bankIndex];
    if (bank.type !== 'questionBank') return;
    if (fromIndex === toIndex) return;
    
    // Adjust editing index if necessary
    if (currentBankIndex === bankIndex && editingBankQuestionIndex === fromIndex) {
        editingBankQuestionIndex = toIndex;
    } else if (currentBankIndex === bankIndex && editingBankQuestionIndex > fromIndex && editingBankQuestionIndex <= toIndex) {
        editingBankQuestionIndex--;
    } else if (currentBankIndex === bankIndex && editingBankQuestionIndex < fromIndex && editingBankQuestionIndex >= toIndex) {
        editingBankQuestionIndex++;
    }
    
    // Move the question within the bank
    const movedQuestion = bank.questions.splice(fromIndex, 1)[0];
    bank.questions.splice(toIndex, 0, movedQuestion);
    
    // Update the display
    updateQuestionsList();
    showSuccessMessage('Question reordered within bank successfully!');
}

// Function to toggle bank minimize/expand state
function toggleBankMinimize(bankIndex) {
    const bank = questions[bankIndex];
    if (bank.type !== 'questionBank') return;
    
    // Initialize minimized property if it doesn't exist (backwards compatibility)
    if (bank.minimized === undefined) {
        bank.minimized = false;
    }
    
    // Toggle the minimized state
    bank.minimized = !bank.minimized;
    
    // Update the display
    updateQuestionsList();
}

// Question Bank Management Functions

function addQuestionBank() {
    const name = prompt('Enter question bank name:', 'Question Bank');
    if (!name || name.trim() === '') return;
    
    const questionsToSelectInput = prompt('How many questions should be selected from this bank?', '3');
    if (!questionsToSelectInput) return;
    
    const questionsToSelect = parseInt(questionsToSelectInput);
    if (isNaN(questionsToSelect) || questionsToSelect < 1) {
        showErrorMessage('Please enter a valid number of questions to select (must be 1 or greater).');
        return;
    }
    
    const questionBank = {
        id: Date.now(),
        type: 'questionBank',
        name: name.trim(),
        questionsToSelect: questionsToSelect,
        questions: [],
        minimized: false,
        createdAt: new Date().toISOString()
    };
    
    questions.push(questionBank);
    updateQuestionsList();
    showSuccessMessage(`Question bank "${name}" created successfully! Add questions to the bank by dragging them onto it.`);
}

function editBankName(bankIndex) {
    const bank = questions[bankIndex];
    if (bank.type !== 'questionBank') return;
    
    // Set editing mode for the bank and show indicator immediately
    currentBankIndex = bankIndex;
    editingBankQuestionIndex = -1; // Not editing a specific question, just the bank
    updateQuestionsList(); // Show the editing indicator immediately
    
    const newName = prompt('Enter new bank name:', bank.name);
    if (!newName) {
        // Reset editing mode if cancelled
        resetEditingMode();
        updateQuestionsList();
        return;
    }
    
    const questionsToSelectInput = prompt(`How many questions should be selected from this bank? (max: ${bank.questions.length})`, bank.questionsToSelect.toString());
    if (!questionsToSelectInput) {
        // Reset editing mode if cancelled
        resetEditingMode();
        updateQuestionsList();
        return;
    }
    
    const questionsToSelect = parseInt(questionsToSelectInput);
    if (isNaN(questionsToSelect) || questionsToSelect < 1 || questionsToSelect > bank.questions.length) {
        alert(`Please enter a valid number between 1 and ${bank.questions.length}.`);
        // Reset editing mode
        resetEditingMode();
        updateQuestionsList();
        return;
    }
    
    bank.name = newName;
    bank.questionsToSelect = questionsToSelect;
    
    // Reset editing mode after successful edit
    resetEditingMode();
    
    updateQuestionsList();
    showSuccessMessage('Bank updated successfully!');
}

function editBankQuestion(bankIndex, questionIndex) {
    const bank = questions[bankIndex];
    if (bank.type !== 'questionBank') return;
    
    const question = bank.questions[questionIndex];
    
    // Populate the main form with this question's data
    document.getElementById('questionText').value = question.question;
    document.getElementById('optionA').value = question.options.A || '';
    document.getElementById('optionB').value = question.options.B || '';
    document.getElementById('optionC').value = question.options.C || '';
    document.getElementById('optionD').value = question.options.D || '';
    document.getElementById('optionE').value = question.options.E || '';
    document.getElementById('correctAnswer').value = question.correctAnswer;
    
    // Update previews
    updateLatexPreview();
    ['optionA', 'optionB', 'optionC', 'optionD', 'optionE'].forEach(optionId => {
        const previewId = 'preview' + optionId.slice(-1);
        updateOptionPreview(optionId, previewId);
    });
    
    // Set editing mode for bank question
    editingQuestionIndex = -1; // Not editing a main question
    currentBankIndex = bankIndex;
    editingBankQuestionIndex = questionIndex;
    
    // Show editing indicator immediately
    updateQuestionsList();
    
    // Change button text
    const submitBtn = document.querySelector('#questionForm button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Update Bank Question';
    
    showSuccessMessage('Question loaded for editing. Update and submit to save changes to the bank.');
}

function deleteBankQuestion(bankIndex, questionIndex) {
    const bank = questions[bankIndex];
    if (bank.type !== 'questionBank') return;
    
    if (confirm('Are you sure you want to delete this question from the bank?')) {
        bank.questions.splice(questionIndex, 1);
        
        // Clear editing mode if we were editing this question
        if (currentBankIndex === bankIndex && editingBankQuestionIndex === questionIndex) {
            clearForm();
            resetEditingMode();
        }
        
        updateQuestionsList();
        showSuccessMessage('Question deleted from bank successfully!');
    }
}

function duplicateBankQuestion(bankIndex, questionIndex) {
    const bank = questions[bankIndex];
    if (bank.type !== 'questionBank') return;
    
    const originalQuestion = bank.questions[questionIndex];
    const duplicatedQuestion = {
        id: Date.now() + Math.random(),
        question: originalQuestion.question,
        options: { ...originalQuestion.options },
        correctAnswer: originalQuestion.correctAnswer
    };
    
    // Insert the duplicated question right after the original
    bank.questions.splice(questionIndex + 1, 0, duplicatedQuestion);
    
    updateQuestionsList();
    showSuccessMessage('Question duplicated in bank successfully!');
}

function resetEditingMode() {
    editingQuestionIndex = -1;
    currentBankIndex = -1;
    editingBankQuestionIndex = -1;
    
    const submitBtn = document.querySelector('#questionForm button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-plus me-2"></i>Add Question';
}

function duplicateQuestionBank(bankIndex) {
    const originalBank = questions[bankIndex];
    
    if (originalBank.type !== 'questionBank') return;
    
    const duplicatedBank = {
        id: Date.now(),
        type: 'questionBank',
        name: originalBank.name + ' (Copy)',
        questionsToSelect: originalBank.questionsToSelect,
        questions: originalBank.questions.map(question => ({
            ...question,
            id: Date.now() + Math.random() // Ensure unique IDs
        })),
        createdAt: new Date().toISOString()
    };
    
    questions.splice(bankIndex + 1, 0, duplicatedBank);
    updateQuestionsList();
    updateQuestionCount();
    
    showSuccessMessage('Question bank duplicated successfully!');
}

function deleteQuestionBank(bankIndex) {
    const bank = questions[bankIndex];
    
    if (bank.type !== 'questionBank') return;
    
    if (confirm(`Are you sure you want to delete the question bank "${bank.name}"? This will remove ${bank.questions.length} questions from the bank.`)) {
        questions.splice(bankIndex, 1);
        updateQuestionsList();
        updateQuestionCount();
        
        showSuccessMessage('Question bank deleted successfully!');
    }
}
