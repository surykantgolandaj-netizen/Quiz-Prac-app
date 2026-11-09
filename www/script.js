const quizContainer = document.querySelector('.quiz');
const resetButton = document.getElementById('resetButton');
const submitButton = document.getElementById('submitButton');
const resultsContainer = document.getElementById('results');
const quizWorkspace = document.getElementById('quizWorkspace');
const historySidebar = document.getElementById('historySidebar');
const toggleSidebarButton = document.getElementById('toggleSidebarButton');
const activeQuizTitleHeader = document.getElementById('activeQuizTitleHeader');
const newQuizCenterButton = document.getElementById('newQuizCenterButton');
const questionCounter = document.getElementById('questionCounter');

// Sidebar Tabs & Panels
const tabNavBtn = document.getElementById('tabNavBtn');
const tabSavedBtn = document.getElementById('tabSavedBtn');
const questionNavPanel = document.getElementById('questionNavPanel');
const savedResultsPanel = document.getElementById('savedResultsPanel');
const questionNavGrid = document.getElementById('questionNavGrid');
const navAnsweredCount = document.getElementById('navAnsweredCount');
const savedResultsList = document.getElementById('savedResultsList');

// Results view elements
const resultsViewTitle = document.getElementById('resultsViewTitle');
const resultsMetaSummary = document.getElementById('resultsMetaSummary');
const resultsTableContainer = document.getElementById('resultsTableContainer');
const backToQuizButton = document.getElementById('backToQuizButton');
const printCurrentResultButton = document.getElementById('printCurrentResultButton');
const downloadCurrentResultButton = document.getElementById('downloadCurrentResultButton');
const edgePrevButton = document.getElementById('edgePrevButton');
const edgeNextButton = document.getElementById('edgeNextButton');

// Naming Modal elements
const saveModal = document.getElementById('saveModal');
const fileNameInput = document.getElementById('fileNameInput');
const saveSessionButton = document.getElementById('saveSessionButton');
const modalHeading = document.getElementById('modalHeading');
const modalDescription = document.getElementById('modalDescription');

const numberOfQuestions = 250;
const STORAGE_KEY = 'quizProgress';
const SESSIONS_STORAGE_KEY = 'savedQuizSessions';
const CONTINUING_SESSION_KEY = 'continuingQuizSessionId';

// Dynamically create 250 quiz question cards
for (let i = 1; i <= numberOfQuestions; i++) {
    const questionDiv = document.createElement('div');
    questionDiv.classList.add('question');
    questionDiv.innerHTML = `
        <h2>Question ${i}</h2>
        <div class="options">
            <div class="option" data-option="1">1</div>
            <div class="option" data-option="2">2</div>
            <div class="option" data-option="3">3</div>
            <div class="option" data-option="4">4</div>
        </div>
    `;
    quizContainer.appendChild(questionDiv);
}

const questions = document.querySelectorAll('.question');

// Dynamically populate Question Navigation Grid in the sidebar
for (let i = 0; i < numberOfQuestions; i++) {
    const navBtn = document.createElement('button');
    navBtn.type = 'button';
    navBtn.className = 'q-nav-btn';
    navBtn.dataset.questionIndex = i;
    navBtn.textContent = i + 1;
    navBtn.addEventListener('click', () => {
        navigateToQuestion(i);
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
        if (activeSessionId !== null) {
            showActiveQuizView();
        }
    });
    questionNavGrid.appendChild(navBtn);
}

// State
let currentQuestionIndex = 0;
let currentOptionIndex = 0;
let isInspectingOptions = false; // true when user explicitly uses ArrowUp/ArrowDown on an answered question
const chosenOptions = {};
let incorrectAnswers = {};
let savedSessions = [];
let activeSessionId = null; // null when taking quiz; session.id when viewing results
let continuingSessionId = null; // session.id of the currently active named quiz

function syncContinuingSession() {
    if (!continuingSessionId) return;
    const session = savedSessions.find((s) => s.id === continuingSessionId);
    if (!session) return;
    if (!session.answers) session.answers = {};
    Object.assign(session.answers, chosenOptions);
    session.lastQuestionIndex = currentQuestionIndex;
    persistSavedSessions();
    renderSidebar();
}

function saveProgress() {
    try {
        const state = {
            currentQuestionIndex,
            currentOptionIndex,
            chosenOptions,
            incorrectAnswers,
            continuingSessionId
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        localStorage.setItem('currentQuestionIndex', String(currentQuestionIndex));
        localStorage.setItem('chosenOptions', JSON.stringify(chosenOptions));
        if (continuingSessionId) {
            localStorage.setItem(CONTINUING_SESSION_KEY, continuingSessionId);
        } else {
            localStorage.removeItem(CONTINUING_SESSION_KEY);
        }
    } catch (e) {}
    syncContinuingSession();
    updateStatusIndicators();
    updateQuestionNavGrid();
    updateEdgeNavButtons();
}

function updateEdgeNavButtons() {
    if (edgePrevButton) {
        edgePrevButton.disabled = currentQuestionIndex <= 0;
        edgePrevButton.classList.toggle('disabled', currentQuestionIndex <= 0);
    }
    if (edgeNextButton) {
        edgeNextButton.disabled = currentQuestionIndex >= numberOfQuestions - 1;
        edgeNextButton.classList.toggle('disabled', currentQuestionIndex >= numberOfQuestions - 1);
    }
}

function loadProgress() {
    try {
        const savedContId = localStorage.getItem(CONTINUING_SESSION_KEY);
        if (savedContId) {
            continuingSessionId = savedContId;
        }
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            const parsed = JSON.parse(savedState);
            if (typeof parsed.currentQuestionIndex === 'number' &&
                parsed.currentQuestionIndex >= 0 &&
                parsed.currentQuestionIndex < numberOfQuestions) {
                currentQuestionIndex = parsed.currentQuestionIndex;
            }
            if (typeof parsed.currentOptionIndex === 'number' &&
                parsed.currentOptionIndex >= 0 &&
                parsed.currentOptionIndex < 4) {
                currentOptionIndex = parsed.currentOptionIndex;
            }
            if (parsed.chosenOptions && typeof parsed.chosenOptions === 'object') {
                Object.assign(chosenOptions, parsed.chosenOptions);
            }
            if (parsed.incorrectAnswers && typeof parsed.incorrectAnswers === 'object') {
                incorrectAnswers = parsed.incorrectAnswers;
            }
            if (parsed.continuingSessionId) {
                continuingSessionId = parsed.continuingSessionId;
            }
        }
    } catch (e) {}
}

function loadSavedSessions() {
    try {
        const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                savedSessions = parsed;
            }
        }
    } catch (e) {
        savedSessions = [];
    }
}

function persistSavedSessions() {
    try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(savedSessions));
    } catch (e) {}
}

function updateStatusIndicators() {
    const answeredCount = Object.keys(chosenOptions).length;
    if (navAnsweredCount) {
        navAnsweredCount.textContent = `${answeredCount} / ${numberOfQuestions}`;
    }
    const currentSession = continuingSessionId ? savedSessions.find((s) => s.id === continuingSessionId) : null;
    if (activeQuizTitleHeader) {
        activeQuizTitleHeader.textContent = currentSession ? currentSession.name : '';
    }
    if (questionCounter) {
        questionCounter.textContent = `${answeredCount} answered`;
    }
}

function updateQuestionNavGrid() {
    const navButtons = questionNavGrid.querySelectorAll('.q-nav-btn');
    navButtons.forEach((btn) => {
        const idx = Number(btn.dataset.questionIndex);
        btn.classList.toggle('answered', chosenOptions[idx] !== undefined);
        btn.classList.toggle('current', idx === currentQuestionIndex);
    });
}

function navigateToQuestion(targetIndex) {
    if (targetIndex < 0 || targetIndex >= numberOfQuestions) return;
    currentQuestionIndex = targetIndex;
    currentOptionIndex = 0;
    isInspectingOptions = false; // Reset inspection state when navigating to a different question
    quizContainer.style.transform = `translateX(-${currentQuestionIndex * 100}%)`;
    updateOptions();
    saveProgress();
}

function restoreChosenHighlights() {
    questions.forEach((question, qIndex) => {
        const opts = question.querySelectorAll('.option');
        opts.forEach((opt) => opt.classList.remove('chosen'));
        if (chosenOptions[qIndex] !== undefined && opts[chosenOptions[qIndex]]) {
            opts[chosenOptions[qIndex]].classList.add('chosen');
        }
    });
}

function updateOptions() {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;
    const options = currentQuestion.querySelectorAll('.option');

    // Remove 'selected' and 'chosen' classes from all options in the current question
    options.forEach((opt) => {
        opt.classList.remove('selected');
        opt.classList.remove('chosen');
    });

    const isQuestionChosen = chosenOptions[currentQuestionIndex] !== undefined;

    // Apply chosen highlight if this question has a chosen option
    if (isQuestionChosen) {
        const chosenIdx = chosenOptions[currentQuestionIndex];
        if (options[chosenIdx]) {
            options[chosenIdx].classList.add('chosen');
        }
    }

    // Revoke 'selected' class from other options unless no option is chosen,
    // OR the user presses Arrow Up / Down to inspect/navigate options on an already answered question
    if (!isQuestionChosen || isInspectingOptions) {
        if (options.length > 0 && currentOptionIndex < options.length) {
            options[currentOptionIndex].classList.add('selected');
        }
    }

    updateStatusIndicators();
    updateQuestionNavGrid();
    updateEdgeNavButtons();
}

function computeSessionStats(session) {
    const answers = session.answers || {};
    const marks = session.marks || {};
    const totalAnswered = Object.keys(answers).length;
    let correctCount = 0;
    let incorrectCount = 0;
    Object.keys(marks).forEach((qIdx) => {
        if (marks[qIdx] === 'correct') correctCount++;
        if (marks[qIdx] === 'incorrect') incorrectCount++;
    });
    return { totalAnswered, correctCount, incorrectCount };
}

function renderSidebar() {
    if (!savedResultsList) return;

    if (savedSessions.length === 0) {
        savedResultsList.innerHTML = '<div class="empty-sidebar-msg">No saved quizzes yet. Click <strong>+</strong> in the top bar to start and name a new quiz.</div>';
        return;
    }

    savedResultsList.innerHTML = '';
    savedSessions.forEach((session) => {
        const stats = computeSessionStats(session);
        const item = document.createElement('div');
        item.className = 'saved-result-item' + (session.id === activeSessionId ? ' active' : '');
        item.dataset.sessionId = session.id;

        const infoDiv = document.createElement('div');
        infoDiv.className = 'saved-item-info';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'saved-item-title';
        titleDiv.textContent = session.name;

        const subDiv = document.createElement('div');
        subDiv.className = 'saved-item-sub';
        subDiv.textContent = `${stats.totalAnswered} answered • ✓${stats.correctCount} ✗${stats.incorrectCount}`;

        infoDiv.appendChild(titleDiv);
        infoDiv.appendChild(subDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'saved-item-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'icon-btn';
        deleteBtn.title = 'Delete quiz';
        deleteBtn.textContent = '✕';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            savedSessions = savedSessions.filter((s) => s.id !== session.id);
            if (continuingSessionId === session.id) {
                continuingSessionId = savedSessions[0] ? savedSessions[0].id : null;
            }
            persistSavedSessions();
            if (activeSessionId === session.id) {
                showActiveQuizView();
            } else {
                renderSidebar();
            }
        });

        actionsDiv.appendChild(deleteBtn);
        item.appendChild(infoDiv);
        item.appendChild(actionsDiv);

        item.addEventListener('click', () => {
            openSavedSessionInViewer(session.id);
        });

        savedResultsList.appendChild(item);
    });
}

function showActiveQuizView() {
    activeSessionId = null;
    quizWorkspace.classList.remove('hidden');
    resultsContainer.classList.remove('active');
    quizContainer.style.transform = `translateX(-${currentQuestionIndex * 100}%)`;
    restoreChosenHighlights();
    renderSidebar();
    updateOptions();
}

function continueQuizFromSession(targetSessionId) {
    loadSavedSessions();
    const sessionIdToContinue = targetSessionId || activeSessionId || continuingSessionId || (savedSessions[0] ? savedSessions[0].id : null);
    const session = savedSessions.find((s) => s.id === sessionIdToContinue);

    if (session) {
        continuingSessionId = session.id;
        if (!session.answers) session.answers = {};
        const mergedAnswers = Object.assign({}, session.answers, chosenOptions);
        Object.keys(chosenOptions).forEach((k) => delete chosenOptions[k]);
        Object.assign(chosenOptions, mergedAnswers);
        session.answers = Object.assign({}, mergedAnswers);

        const answeredIndices = Object.keys(chosenOptions).map(Number).filter((n) => !isNaN(n));
        if (answeredIndices.length > 0) {
            const maxAnswered = Math.max(...answeredIndices);
            currentQuestionIndex = Math.min(maxAnswered + 1, numberOfQuestions - 1);
        } else if (typeof session.lastQuestionIndex === 'number') {
            currentQuestionIndex = Math.min(Math.max(session.lastQuestionIndex, 0), numberOfQuestions - 1);
        } else {
            currentQuestionIndex = 0;
        }
        currentOptionIndex = 0;
        persistSavedSessions();
    }

    saveProgress();
    showActiveQuizView();
}

function updateResult(checkbox, questionIndex, type) {
    const row = checkbox.closest('tr');
    const session = savedSessions.find((s) => s.id === activeSessionId);
    if (!session) return;
    if (!session.marks) session.marks = {};

    const currentRow = checkbox.closest('tr');
    const correctCb = currentRow ? currentRow.querySelector(`input[name="correct${questionIndex}"]`) : null;
    const incorrectCb = currentRow ? currentRow.querySelector(`input[name="incorrect${questionIndex}"]`) : null;

    if (type === 'correct' && checkbox.checked && incorrectCb) {
        incorrectCb.checked = false;
    } else if (type === 'incorrect' && checkbox.checked && correctCb) {
        correctCb.checked = false;
    }

    if (incorrectCb && incorrectCb.checked) {
        row.classList.add('incorrect');
        row.classList.remove('correct-row');
        session.marks[questionIndex] = 'incorrect';
    } else if (correctCb && correctCb.checked) {
        row.classList.remove('incorrect');
        row.classList.add('correct-row');
        session.marks[questionIndex] = 'correct';
    } else {
        row.classList.remove('incorrect', 'correct-row');
        delete session.marks[questionIndex];
    }

    persistSavedSessions();
    renderSessionMeta(session);
    renderSidebar();
}

function renderSessionMeta(session) {
    const stats = computeSessionStats(session);
    const graded = stats.correctCount + stats.incorrectCount;
    const accuracy = graded > 0 ? Math.round((stats.correctCount / graded) * 100) + '%' : '—';
    resultsMetaSummary.innerHTML = `
        <span class="stat-chip">Saved: ${session.createdAt || 'Just now'}</span>
        <span class="stat-chip">Answered: ${stats.totalAnswered} / ${numberOfQuestions}</span>
        <span class="stat-chip correct-chip">Correct: ${stats.correctCount}</span>
        <span class="stat-chip incorrect-chip">Incorrect: ${stats.incorrectCount}</span>
        <span class="stat-chip">Accuracy: ${accuracy}</span>
    `;
}

function openSavedSessionInViewer(sessionId) {
    const session = savedSessions.find((s) => s.id === sessionId);
    if (!session) return;
    activeSessionId = session.id;
    continuingSessionId = session.id;
    quizWorkspace.classList.add('hidden');
    resultsContainer.classList.add('active');
    resultsViewTitle.textContent = session.name;
    renderSessionMeta(session);

    const answers = session.answers || {};
    const marks = session.marks || {};
    const answeredIndices = Object.keys(answers).map(Number).sort((a, b) => a - b);

    if (answeredIndices.length === 0) {
        resultsTableContainer.innerHTML = '<div class="empty-sidebar-msg">No questions were answered in this session yet. Click <strong>Back to Quiz</strong> to continue answering.</div>';
    } else {
        let tableHtml = '<table class="results-table"><thead><tr><th>Question</th><th>Your Answer</th><th>Mark Correct/Incorrect</th></tr></thead><tbody>';
        answeredIndices.forEach((i) => {
            const mark = marks[i];
            const isCorrect = mark === 'correct';
            const isIncorrect = mark === 'incorrect';
            const rowClass = isIncorrect ? 'incorrect' : (isCorrect ? 'correct-row' : '');
            tableHtml += `
                <tr class="${rowClass}">
                    <td>Question ${i + 1}</td>
                    <td>Option ${answers[i] + 1}</td>
                    <td class="checkbox">
                        <label for="correct${i}">
                            <input type="checkbox" id="correct${i}" name="correct${i}" data-qindex="${i}" data-mtype="correct" ${isCorrect ? 'checked' : ''}>
                            Correct
                        </label>
                        <label for="incorrect${i}">
                            <input type="checkbox" id="incorrect${i}" name="incorrect${i}" data-qindex="${i}" data-mtype="incorrect" ${isIncorrect ? 'checked' : ''}>
                            Incorrect
                        </label>
                    </td>
                </tr>`;
        });
        tableHtml += '</tbody></table>';
        resultsTableContainer.innerHTML = tableHtml;

        resultsTableContainer.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            cb.addEventListener('change', () => {
                const qIndex = Number(cb.dataset.qindex);
                const mType = cb.dataset.mtype;
                updateResult(cb, qIndex, mType);
            });
        });
    }
    renderSidebar();
}

// Option click handling
document.addEventListener('click', (e) => {
    if (activeSessionId !== null) return;
    if (e.target.classList.contains('option')) {
        const options = questions[currentQuestionIndex].querySelectorAll('.option');
        chosenOptions[currentQuestionIndex] = Array.from(options).indexOf(e.target);
        isInspectingOptions = false; // Option chosen again -> revoke selected highlight
        updateOptions();
        if (currentQuestionIndex < numberOfQuestions - 1) {
            currentQuestionIndex++;
            currentOptionIndex = 0;
        }
        quizContainer.style.transform = `translateX(-${currentQuestionIndex * 100}%)`;
        updateOptions();
        saveProgress();
    }
});

// Key navigation
document.addEventListener('keydown', (e) => {
    if (saveModal && saveModal.classList.contains('open')) {
        if (e.key === 'Escape') {
            e.preventDefault();
            // Don't close if a quiz must be named first
            if (savedSessions.length > 0) {
                closeSaveModal();
            }
        } else if (e.key === 'Enter' && document.activeElement === fileNameInput) {
            e.preventDefault();
            saveSessionButton.click();
        }
        return;
    }
    if (e.target && (e.target.tagName === 'INPUT' && e.target.type === 'text' || e.target.tagName === 'TEXTAREA')) {
        return;
    }

    if (activeSessionId !== null) {
        const checkboxes = resultsTableContainer.querySelectorAll('input[type="checkbox"]');
        if (checkboxes.length === 0) return;
        const focusedCheckbox = document.activeElement;
        const idx = Array.from(checkboxes).indexOf(focusedCheckbox);

        if (e.key === 'Enter' && focusedCheckbox && focusedCheckbox.type === 'checkbox') {
            e.preventDefault();
            focusedCheckbox.checked = !focusedCheckbox.checked;
            focusedCheckbox.dispatchEvent(new Event('change'));
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = idx === -1 ? 0 : idx + 2;
            if (nextIndex < checkboxes.length) checkboxes[nextIndex].focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = idx === -1 ? 0 : idx - 2;
            if (prevIndex >= 0) checkboxes[prevIndex].focus();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            if (!focusedCheckbox || focusedCheckbox.type !== 'checkbox') return;
            e.preventDefault();
            const currentRow = focusedCheckbox.closest('tr');
            if (!currentRow) return;
            const rowCheckboxes = currentRow.querySelectorAll('input[type="checkbox"]');
            const currentIndex = Array.from(rowCheckboxes).indexOf(focusedCheckbox);
            if (e.key === 'ArrowRight' && currentIndex < rowCheckboxes.length - 1) {
                rowCheckboxes[currentIndex + 1].focus();
            } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
                rowCheckboxes[currentIndex - 1].focus();
            }
        }
        return;
    }

    const options = questions[currentQuestionIndex].querySelectorAll('.option');

    if (e.key === 'Enter') {
        if (currentOptionIndex < options.length) {
            chosenOptions[currentQuestionIndex] = currentOptionIndex;
            isInspectingOptions = false; // Option chosen -> revoke selected from others
            updateOptions();
        }
        if (currentQuestionIndex < numberOfQuestions - 1) {
            currentQuestionIndex++;
            currentOptionIndex = 0;
            isInspectingOptions = false;
        }
    } else if (e.key === ' ') {
        e.preventDefault();
        submitButton.click();
        return;
    } else if (e.key === 'ArrowRight') {
        if (currentQuestionIndex < numberOfQuestions - 1) {
            currentQuestionIndex++;
            currentOptionIndex = 0;
            isInspectingOptions = false; // Navigated to different question
        }
    } else if (e.key === 'ArrowLeft') {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            currentOptionIndex = 0;
            isInspectingOptions = false; // Navigated to different question
        }
    } else if (e.key === 'ArrowDown') {
        // If question already has a chosen option, initialize currentOptionIndex to it on first press
        if (chosenOptions[currentQuestionIndex] !== undefined && !isInspectingOptions) {
            currentOptionIndex = chosenOptions[currentQuestionIndex];
        }
        if (currentOptionIndex < options.length - 1) {
            currentOptionIndex++;
        }
        isInspectingOptions = true; // Continue quiz keyboard navigation until navigated or chosen again
    } else if (e.key === 'ArrowUp') {
        if (chosenOptions[currentQuestionIndex] !== undefined && !isInspectingOptions) {
            currentOptionIndex = chosenOptions[currentQuestionIndex];
        }
        if (currentOptionIndex > 0) {
            currentOptionIndex--;
        }
        isInspectingOptions = true; // Continue quiz keyboard navigation until navigated or chosen again
    }

    quizContainer.style.transform = `translateX(-${currentQuestionIndex * 100}%)`;
    updateOptions();
    saveProgress();
});

// Sidebar Toggle & Tabs
const sidebarBackdrop = document.getElementById('sidebarBackdrop');

function toggleSidebar() {
    const isNowCollapsed = historySidebar.classList.toggle('collapsed');
    if (sidebarBackdrop) {
        sidebarBackdrop.classList.toggle('active', !isNowCollapsed);
    }
}

function closeSidebar() {
    historySidebar.classList.add('collapsed');
    if (sidebarBackdrop) {
        sidebarBackdrop.classList.remove('active');
    }
}

toggleSidebarButton.addEventListener('click', toggleSidebar);

if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', closeSidebar);
}

tabNavBtn.addEventListener('click', () => {
    tabNavBtn.classList.add('active');
    tabSavedBtn.classList.remove('active');
    questionNavPanel.classList.add('active');
    savedResultsPanel.classList.remove('active');
});

tabSavedBtn.addEventListener('click', () => {
    tabSavedBtn.classList.add('active');
    tabNavBtn.classList.remove('active');
    savedResultsPanel.classList.add('active');
    questionNavPanel.classList.remove('active');
});

// Edge Navigation Buttons
if (edgePrevButton) {
    edgePrevButton.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            currentOptionIndex = 0;
            isInspectingOptions = false; // Reset on question navigation
            quizContainer.style.transform = `translateX(-${currentQuestionIndex * 100}%)`;
            updateOptions();
            saveProgress();
        }
    });
}

if (edgeNextButton) {
    edgeNextButton.addEventListener('click', () => {
        if (currentQuestionIndex < numberOfQuestions - 1) {
            currentQuestionIndex++;
            currentOptionIndex = 0;
            isInspectingOptions = false; // Reset on question navigation
            quizContainer.style.transform = `translateX(-${currentQuestionIndex * 100}%)`;
            updateOptions();
            saveProgress();
        }
    });
}

// Back to Quiz button
backToQuizButton.addEventListener('click', () => {
    continueQuizFromSession(activeSessionId || continuingSessionId);
});

function normalizeFileName(rawName) {
    let trimmed = (rawName || '').trim();
    if (!trimmed) {
        trimmed = 'quiz-results.html';
    }
    trimmed = trimmed.replace(/[<>:"/\\|?*]+/g, '-');
    if (!/\.html?$/i.test(trimmed)) {
        trimmed += '.html';
    }
    return trimmed;
}

function triggerHtmlDownload(fileName, htmlContent) {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadActiveResultAsHtml() {
    const targetId = activeSessionId || continuingSessionId || (savedSessions[0] ? savedSessions[0].id : null);
    let session = savedSessions.find((s) => s.id === targetId);
    if (!session) {
        session = createNamedQuiz('Quiz Results');
    }
    const fileName = session.fileName || normalizeFileName(session.name);
    const resultHtml = buildResultHtml(session);
    triggerHtmlDownload(fileName, resultHtml);
}

printCurrentResultButton.addEventListener('click', () => {
    downloadActiveResultAsHtml();
});

downloadCurrentResultButton.addEventListener('click', () => {
    downloadActiveResultAsHtml();
});

// Reset Button: resets current quiz answers
resetButton.addEventListener('click', () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('currentQuestionIndex');
        localStorage.removeItem('chosenOptions');
    } catch (e) {}
    currentQuestionIndex = 0;
    currentOptionIndex = 0;
    Object.keys(chosenOptions).forEach((key) => delete chosenOptions[key]);
    incorrectAnswers = {};
    if (continuingSessionId) {
        const session = savedSessions.find((s) => s.id === continuingSessionId);
        if (session) {
            session.answers = {};
            session.marks = {};
            persistSavedSessions();
        }
    }
    questions.forEach((q) => {
        q.querySelectorAll('.option').forEach((opt) => {
            opt.classList.remove('selected', 'chosen');
        });
    });
    quizContainer.style.transform = 'translateX(0%)';
    showActiveQuizView();
});

// Creates and registers a new named quiz
function createNamedQuiz(rawName) {
    const cleanTitle = (rawName || '').trim().replace(/\.html?$/i, '') || `Quiz ${savedSessions.length + 1}`;
    const fileName = normalizeFileName(cleanTitle);
    const nowStr = new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    // Clear current answers for brand new quiz
    Object.keys(chosenOptions).forEach((key) => delete chosenOptions[key]);
    currentQuestionIndex = 0;
    currentOptionIndex = 0;

    const session = {
        id: 'session_' + Date.now(),
        name: cleanTitle,
        fileName: fileName,
        createdAt: nowStr,
        lastQuestionIndex: 0,
        answers: {},
        marks: {}
    };

    savedSessions.unshift(session);
    continuingSessionId = session.id;
    persistSavedSessions();
    saveProgress();
    showActiveQuizView();
    return session;
}

function buildResultHtml(session) {
    const titleText = (session && session.name) ? session.name : 'Quiz Results';
    const answers = (session && session.answers) ? session.answers : {};
    const marks = (session && session.marks) ? session.marks : {};
    const keys = Object.keys(answers).map(Number).sort((a, b) => a - b);

    let rowsHtml = '';
    keys.forEach((i) => {
        const m = marks[i];
        const rClass = m === 'incorrect' ? 'incorrect' : (m === 'correct' ? 'correct-row' : '');
        rowsHtml += `
            <tr class="${rClass}">
                <td>Question ${i + 1}</td>
                <td>Option ${answers[i] + 1}</td>
                <td class="checkbox">
                    <label><input type="checkbox" id="correct${i}" name="correct${i}" ${m === 'correct' ? 'checked' : ''} onchange="updateStandaloneResult(this, ${i}, 'correct')"> Correct</label>
                    <label><input type="checkbox" id="incorrect${i}" name="incorrect${i}" ${m === 'incorrect' ? 'checked' : ''} onchange="updateStandaloneResult(this, ${i}, 'incorrect')"> Incorrect</label>
                </td>
            </tr>`;
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${titleText}</title>
    <style>
        body {
            font-family: 'Inter', Arial, sans-serif;
            margin: 0;
            background-color: #131314;
            color: #e3e3e3;
            padding: 40px 10%;
        }
        h1 {
            color: #a8c7fa;
            text-align: center;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background-color: #1e1f20;
            border-radius: 16px;
            overflow: hidden;
            margin-top: 20px;
        }
        th, td {
            padding: 12px 16px;
            text-align: left;
            color: #e3e3e3;
            border-bottom: 1px solid #2d2e30;
        }
        th {
            background-color: #004a77;
            color: #c2e7ff;
        }
        tr.incorrect {
            background-color: rgba(220, 53, 69, 0.35);
        }
        tr.correct-row {
            background-color: rgba(40, 167, 69, 0.22);
        }
        .checkbox {
            display: flex;
            align-items: center;
            gap: 14px;
        }
    </style>
</head>
<body>
    <h1>${titleText}</h1>
    <table>
        <thead>
            <tr><th>Question</th><th>Your Answer</th><th>Mark Correct/Incorrect</th></tr>
        </thead>
        <tbody>
            ${rowsHtml}
        </tbody>
    </table>
    <script>
        function updateStandaloneResult(checkbox, qIdx, type) {
            const row = checkbox.closest('tr');
            const cCb = row.querySelector('input[name="correct' + qIdx + '"]');
            const iCb = row.querySelector('input[name="incorrect' + qIdx + '"]');
            if (type === 'correct' && checkbox.checked && iCb) iCb.checked = false;
            if (type === 'incorrect' && checkbox.checked && cCb) cCb.checked = false;
            if (iCb && iCb.checked) {
                row.className = 'incorrect';
            } else if (cCb && cCb.checked) {
                row.className = 'correct-row';
            } else {
                row.className = '';
            }
        }
    </script>
</body>
</html>`;
}

function promptForNewQuiz() {
    modalHeading.textContent = 'Name Your New Quiz';
    modalDescription.textContent = 'Enter a name for this new quiz. It will not be created until named, and will be saved in your Saved Quizzes:';
    fileNameInput.value = `Quiz ${savedSessions.length + 1}`;
    saveSessionButton.textContent = 'Start Quiz';
    saveModal.classList.add('open');
    saveModal.setAttribute('aria-hidden', 'false');
    fileNameInput.focus();
    fileNameInput.select();
}

function closeSaveModal() {
    saveModal.classList.remove('open');
    saveModal.setAttribute('aria-hidden', 'true');
}

// Center plus button triggers new quiz naming modal
newQuizCenterButton.addEventListener('click', () => {
    promptForNewQuiz();
});

// Modal submission creates and names the quiz
saveSessionButton.addEventListener('click', () => {
    const quizName = fileNameInput.value.trim() || `Quiz ${savedSessions.length + 1}`;
    createNamedQuiz(quizName);
    closeSaveModal();
});

// Submit Button: opens current quiz in results view directly (since it is already named)
submitButton.addEventListener('click', () => {
    if (!continuingSessionId) {
        promptForNewQuiz();
        return;
    }
    syncContinuingSession();
    openSavedSessionInViewer(continuingSessionId);
});

// Handle swipe navigation on the body
document.addEventListener('DOMContentLoaded', () => {
    const threshold = 50;
    let deltaX = 0;

    document.body.addEventListener('wheel', (e) => {
        if (activeSessionId !== null) return;
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            deltaX += e.deltaX;
            if (Math.abs(deltaX) > threshold) {
                handleSwipe(deltaX);
                deltaX = 0;
            }
        }
    });

    function handleSwipe(deltaX) {
        if (deltaX > 0 && currentQuestionIndex < numberOfQuestions - 1) {
            currentQuestionIndex++;
            currentOptionIndex = 0;
            isInspectingOptions = false;
        } else if (deltaX < 0 && currentQuestionIndex > 0) {
            currentQuestionIndex--;
            currentOptionIndex = 0;
            isInspectingOptions = false;
        }
        quizContainer.style.transform = `translateX(-${currentQuestionIndex * 100}%)`;
        updateOptions();
        saveProgress();
    }

    loadSavedSessions();
    loadProgress();

    // If no session exists yet, prompt user to name their first quiz immediately!
    if (savedSessions.length === 0) {
        promptForNewQuiz();
    } else {
        if (!continuingSessionId) {
            continuingSessionId = savedSessions[0].id;
        }
        restoreChosenHighlights();
        quizContainer.style.transform = `translateX(-${currentQuestionIndex * 100}%)`;
        renderSidebar();
        updateOptions();
    }
});


// ==========================================================================
// Progressive Web App (PWA) & Device Installation
// ==========================================================================
const installAppBtn = document.getElementById('installAppBtn');
const installGuideModal = document.getElementById('installGuideModal');
const closeInstallGuideBtn = document.getElementById('closeInstallGuideBtn');
const downloadApkFallbackBtn = document.getElementById('downloadApkFallbackBtn');
const installModalTitle = document.getElementById('installModalTitle');
const installModalDesc = document.getElementById('installModalDesc');
const installStepsContainer = document.getElementById('installStepsContainer');
let deferredPrompt = null;

function isMobileDevice() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 1);
    const isSmallScreen = window.innerWidth <= 820;
    return mobileRegex.test(ua) || (hasTouch && isSmallScreen);
}

function isIOS() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    return /iphone|ipad|ipod/i.test(ua);
}

function isAndroid() {
    const ua = navigator.userAgent || '';
    return /android/i.test(ua);
}

// Register Service Worker for offline capabilities and PWA detection
if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { scope: './' })
            .then((reg) => console.log('ServiceWorker registered with scope:', reg.scope))
            .catch((err) => console.warn('ServiceWorker registration error:', err));
    });
}

// Capture native PWA install prompt (both mobile Chrome/Samsung Internet and desktop Chrome/Edge)
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installAppBtn) {
        installAppBtn.classList.add('ready-to-install');
    }
});

window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installAppBtn) {
        installAppBtn.style.display = 'none';
    }
});

function downloadApk() {
    try {
        const a = document.createElement('a');
        a.href = 'QuizStudio.apk';
        a.download = 'QuizStudio.apk';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (e) {}
}

function populateInstallGuide() {
    if (!installStepsContainer) return;

    if (isIOS()) {
        installModalTitle.textContent = 'Install on iPhone / iPad';
        installModalDesc.textContent = 'Add Quiz Studio directly to your iOS Home Screen with its own app icon and full-screen view:';
        installStepsContainer.innerHTML = `
            <div class="install-step-item">
                <span class="step-num">1</span>
                <div class="step-desc">Tap the <strong>Share</strong> button <code class="code-pill">⎋</code> in the Safari toolbar at the bottom of your screen.</div>
            </div>
            <div class="install-step-item">
                <span class="step-num">2</span>
                <div class="step-desc">Scroll down and tap <strong>Add to Home Screen</strong> <code class="code-pill">⊞</code>.</div>
            </div>
            <div class="install-step-item">
                <span class="step-num">3</span>
                <div class="step-desc">Tap <strong>Add</strong> in the top-right corner. Quiz Studio will appear on your Home Screen as an installed app!</div>
            </div>
        `;
        if (downloadApkFallbackBtn) downloadApkFallbackBtn.style.display = 'none';
    } else if (isAndroid()) {
        installModalTitle.textContent = 'Install on Android';
        installModalDesc.textContent = 'Install Quiz Studio as an app on your Android device (no APK security warnings, instant updates, and offline access):';
        installStepsContainer.innerHTML = `
            <div class="install-step-item">
                <span class="step-num">1</span>
                <div class="step-desc">In Chrome or Samsung Internet, tap the <strong>⋮ (Menu)</strong> icon in the top-right corner.</div>
            </div>
            <div class="install-step-item">
                <span class="step-num">2</span>
                <div class="step-desc">Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</div>
            </div>
            <div class="install-step-item">
                <span class="step-num">3</span>
                <div class="step-desc">Tap <strong>Install</strong> to confirm. Quiz Studio will install straight to your app drawer and home screen.</div>
            </div>
        `;
        if (downloadApkFallbackBtn) downloadApkFallbackBtn.style.display = 'inline-flex';
    } else {
        installModalTitle.textContent = 'Install on Desktop';
        installModalDesc.textContent = 'Install Quiz Studio as a standalone desktop application with offline support and a dedicated launch window:';
        installStepsContainer.innerHTML = `
            <div class="install-step-item">
                <span class="step-num">1</span>
                <div class="step-desc"><strong>Google Chrome:</strong> Click the <strong>Install</strong> icon <code class="code-pill">⊕</code> on the right side of the address bar, or click <strong>⋮ → Cast, save, and share → Install Quiz Studio...</strong></div>
            </div>
            <div class="install-step-item">
                <span class="step-num">2</span>
                <div class="step-desc"><strong>Microsoft Edge:</strong> Click the <strong>App available</strong> icon <code class="code-pill">⊞</code> in the address bar, or click <strong>… → Apps → Install this site as an app</strong>.</div>
            </div>
            <div class="install-step-item">
                <span class="step-num">3</span>
                <div class="step-desc"><strong>macOS Safari:</strong> Click <strong>File → Add to Dock...</strong> from the top menu bar to create a standalone Mac app.</div>
            </div>
        `;
        if (downloadApkFallbackBtn) downloadApkFallbackBtn.style.display = 'none';
    }
}

function openInstallGuide() {
    populateInstallGuide();
    if (installGuideModal) {
        installGuideModal.classList.add('open');
        installGuideModal.setAttribute('aria-hidden', 'false');
    }
}

function closeInstallGuide() {
    if (installGuideModal) {
        installGuideModal.classList.remove('open');
        installGuideModal.setAttribute('aria-hidden', 'true');
    }
}

if (installAppBtn) {
    installAppBtn.addEventListener('click', async () => {
        // If native PWA install prompt is available (both Mobile and Desktop Chrome/Edge), trigger it directly!
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                deferredPrompt = null;
            }
        } else {
            // Otherwise, open the device-tailored step-by-step guidance
            openInstallGuide();
        }
    });
}

if (downloadApkFallbackBtn) {
    downloadApkFallbackBtn.addEventListener('click', downloadApk);
}

if (closeInstallGuideBtn) {
    closeInstallGuideBtn.addEventListener('click', closeInstallGuide);
}

if (installGuideModal) {
    installGuideModal.addEventListener('click', (e) => {
        if (e.target === installGuideModal) {
            closeInstallGuide();
        }
    });
}
