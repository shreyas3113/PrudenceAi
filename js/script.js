// script.js
import { auth, database } from './firebase.js';
import { loginUser, signUpUser, logoutUser, checkAuthState } from './auth.js';
import { loadFaqsFromFirebase, getFaqAnswer } from './faq.js';
import { aiModels } from './aiModels.js';
import { initializeThemeToggle } from './theme.js';
import { cerebrasAPI } from './cerebras.js';

import { ref, set, get, push, remove } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// Configure marked.js to use highlight.js for code blocks
if (typeof marked !== 'undefined') {
    marked.setOptions({
        highlight: function(code, lang) {
            if (window.hljs) {
                if (lang && window.hljs.getLanguage(lang)) {
                    return window.hljs.highlight(code, { language: lang }).value;
                } else {
                    return window.hljs.highlightAuto(code).value;
                }
            }
            return code;
        }
    });
}

// Firebase initialization check
const checkFirebaseInit = () => {
    try {
        return auth && database;
    } catch (error) {
        console.error('Error checking Firebase initialization:', error);
        return false;
    }
};

class ChatInterface {
    constructor() {
        // Enable compareMode by default
        this.compareMode = true;
        // Default selected bots for ensemble mode
        this.selectedBots = ['llama4-maverick-17b-128e-instruct', 'llama4-scout-17b-16e-instruct', 'llama3-8b'];

        // Always activate ensemble toggle and container
        if (this.compareToggle) this.compareToggle.classList.add('active');
        if (this.compareContainer) this.compareContainer.classList.add('active');

        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.newChatButton = document.getElementById('newChatButton');
        this.chatHistoryList = document.getElementById('chatHistoryList');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.sidebar = document.querySelector('.sidebar');
        this.botsPanel = document.getElementById('botsPanel');
        this.botsGrid = document.getElementById('botsGrid');
        this.botsToggle = document.getElementById('botsToggle');
        this.compareToggle = document.getElementById('compareToggle');
        this.compareContainer = document.getElementById('compareContainer');
        this.compareResponses = document.getElementById('compareResponses');
        this.chatTitle = document.getElementById('chatTitle');
        this.carouselTrack = document.getElementById('carouselTrack');
        this.carouselPrev = document.getElementById('carouselPrev');
        this.carouselNext = document.getElementById('carouselNext');
        this.authButtons = document.getElementById('authButtons');
        this.authModal = document.getElementById('authModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalEmail = document.getElementById('modalEmail');
        this.modalPassword = document.getElementById('modalPassword');
        this.modalSubmit = document.getElementById('modalSubmit');
        this.modalClose = document.getElementById('modalClose');
        this.toggleModalAuth = document.getElementById('toggleModalAuth');
        this.logoutBtn = document.querySelector('.logout-btn');

        this.currentChatId = null;
        this.chatHistory = [];
        this.messages = [];
        this.faqs = [];
        this.personalityFaqs = [];
        this.modelTemperatures = {};

        this.aiModels = aiModels;

        this.auth = auth;
        this.database = database;
        
        // Firebase initialization check
        if (checkFirebaseInit()) {
            console.log("✅ Firebase initialized successfully");
            this.firebaseConfigured = true;
        } else {
            console.log("❌ Firebase initialization failed");
            this.firebaseConfigured = false;
        }
        
        // Set default configuration values
        this.appName = 'Prudence AI';
        this.maxChatHistory = 20;
        this.maxMessageLength = 1000;
        this.maxAiModels = 3;

        this.initializeEventListeners();
        this.initializeCarousel();
        this.renderChatHistory();
        this.startNewChat();
        this.updateBotSelection();
        this.hideChatArea(); // Show login message initially
        this.checkAuthState();
        this.loadFaqsFromFirebase();
    }

    // Authentication Methods
    checkAuthState() {
        checkAuthState((user) => {
            if (user) {
                this.authButtons.querySelector('.login-btn').style.display = 'none';
                this.authButtons.querySelector('.signup-btn').style.display = 'none';
                this.authButtons.querySelector('.logout-btn').style.display = 'block';
                this.loadChatHistoryFromFirebase(user.uid);
                this.showChatArea();
            } else {
                this.authButtons.querySelector('.login-btn').style.display = 'block';
                this.authButtons.querySelector('.signup-btn').style.display = 'block';
                this.authButtons.querySelector('.logout-btn').style.display = 'none';
                this.hideChatArea();
            }
        });
    }

    showAuthModal(isLogin = true) {
        this.authModal.style.display = 'block';
        this.modalTitle.textContent = isLogin ? 'Login' : 'Sign Up';
        this.modalSubmit.textContent = isLogin ? 'Login' : 'Sign Up';
        // Clear any previous success message
        const successMessage = this.authModal.querySelector('.success-message');
        if (successMessage) successMessage.remove();
    }

    hideAuthModal() {
        this.authModal.style.display = 'none';
        this.modalEmail.value = '';
        this.modalPassword.value = '';
        // Clear success message when closing
        const successMessage = this.authModal.querySelector('.success-message');
        if (successMessage) successMessage.remove();
    }

    loginUser(email, password) {
        loginUser(email, password,
            (userCredential) => {
                console.log("User signed in with UID:", userCredential.user.uid);
                // Add welcome message to chat interface
                this.addMessage(`Welcome ${email.split('@')[0]}! You have successfully logged in.`, 'ai');
                // Hide modal
                this.hideAuthModal();
            },
            (error) => {
                console.error("Error signing in:", error.code, error.message);
                // Add error message to the modal
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.style.cssText = 'color: red; text-align: center; margin-top: 10px;';
                errorDiv.textContent = `Error: ${error.message}`;
                this.authModal.querySelector('div').appendChild(errorDiv);
                setTimeout(() => {
                    if (errorDiv.parentNode) errorDiv.remove();
                }, 3000);
            }
        );
    }

    signUpUser(email, password) {
        signUpUser(email, password,
            (userCredential) => {
                const userId = userCredential.user.uid;
                set(ref(this.database, 'users/' + userId), { email: email })
                    .then(() => {
                        console.log("User signed up and data saved with UID:", userId);
                        // Add welcome message to chat interface
                        this.addMessage(`Welcome ${email.split('@')[0]}! You have successfully signed up.`, 'ai');
                        // Auto-login and hide modal
                        loginUser(email, password,
                            () => this.hideAuthModal(),
                            (error) => {
                                console.error("Error signing in after signup:", error.message);
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'error-message';
                                errorDiv.style.cssText = 'color: red; text-align: center; margin-top: 10px;';
                                errorDiv.textContent = `Error: ${error.message}`;
                                this.authModal.querySelector('div').appendChild(errorDiv);
                                setTimeout(() => {
                                    if (errorDiv.parentNode) errorDiv.remove();
                                }, 3000);
                            }
                        );
                    })
                    .catch((error) => {
                        console.error("Error saving data or signing in:", error.message);
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'error-message';
                        errorDiv.style.cssText = 'color: red; text-align: center; margin-top: 10px;';
                        errorDiv.textContent = `Error: ${error.message}`;
                        this.authModal.querySelector('div').appendChild(errorDiv);
                        setTimeout(() => {
                            if (errorDiv.parentNode) errorDiv.remove();
                        }, 3000);
                    });
            },
            (error) => {
                console.error("Error signing up:", error.code, error.message);
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.style.cssText = 'color: red; text-align: center; margin-top: 10px;';
                errorDiv.textContent = `Error: ${error.message}`;
                this.authModal.querySelector('div').appendChild(errorDiv);
                setTimeout(() => {
                    if (errorDiv.parentNode) errorDiv.remove();
                }, 3000);
            }
        );
    }

    logoutUser() {
        logoutUser(
            () => {
                console.log("User signed out");
                this.hideChatArea(); // Show login message after logout
                if (this.compareContainer) {
                    this.compareContainer.style.display = 'none';
                }
            },
            (error) => {
                console.error("Error signing out:", error.message);
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.style.cssText = 'color: red; text-align: center; margin-top: 10px;';
                errorDiv.textContent = `Error: ${error.message}`;
                this.authModal.querySelector('div').appendChild(errorDiv);
                setTimeout(() => {
                    if (errorDiv.parentNode) errorDiv.remove();
                }, 3000);
            }
        );
    }

    // FAQ Methods - Updated to use imported functions
    loadFaqsFromFirebase() {
        loadFaqsFromFirebase(
            (faqs) => {
                this.faqs = faqs;
            },
            (personalityFaqs) => {
                this.personalityFaqs = personalityFaqs;
            }
        );
    }

    getFaqAnswer(message) {
        return getFaqAnswer(message, this.faqs, this.personalityFaqs);
    }





    // Firebase Chat History Methods
    loadChatHistoryFromFirebase(userId) {
        get(ref(this.database, `users/${userId}/chatHistory`))
            .then((snapshot) => {
                if (snapshot.exists()) {
                    this.chatHistory = snapshot.val();
                    this.renderChatHistory();
                } else {
                    this.chatHistory = [];
                    this.renderChatHistory();
                }
            })
            .catch((error) => {
                console.error("Error loading chat history:", error);
                this.chatHistory = [];
                this.renderChatHistory();
            });
    }

    saveChatHistoryToFirebase() {
        const user = this.auth.currentUser;
        if (!user) return;

        if (this.messages.length > 0) {
            const existingChatIndex = this.chatHistory.findIndex(chat => chat.id === this.currentChatId);
            const chatData = {
                id: this.currentChatId,
                title: this.messages[0].content.substring(0, 30) + (this.messages[0].content.length > 30 ? '...' : ''),
                messages: this.messages,
                lastUpdated: Date.now()
            };

            if (existingChatIndex !== -1) {
                this.chatHistory[existingChatIndex] = chatData;
            } else {
                this.chatHistory.unshift(chatData);
            }

            // Keep only the last 20 chats
            this.chatHistory = this.chatHistory.slice(0, 20);

            // Save to Firebase
            set(ref(this.database, `users/${user.uid}/chatHistory`), this.chatHistory)
                .then(() => {
                    console.log("Chat history saved to Firebase");
                })
                .catch((error) => {
                    console.error("Error saving chat history to Firebase:", error);
                });

            this.renderChatHistory();
        }
    }

    deleteChatFromFirebase(chatId) {
        const user = this.auth.currentUser;
        if (!user) return;

        this.chatHistory = this.chatHistory.filter(chat => chat.id !== chatId);
        
        set(ref(this.database, `users/${user.uid}/chatHistory`), this.chatHistory)
            .then(() => {
                console.log("Chat deleted from Firebase");
                this.renderChatHistory();
            })
            .catch((error) => {
                console.error("Error deleting chat from Firebase:", error);
            });
    }

    // Existing Methods (with minor adjustments)
    formatAnswer(text) {
        return text
            .replace(/```html([\s\S]*?)```/g, '<pre><code class="language-html">$1</code></pre>')
            .replace(/```css([\s\S]*?)```/g, '<pre><code class="language-css">$1</code></pre>')
            .replace(/```javascript([\s\S]*?)```/g, '<pre><code class="language-javascript">$1</code></pre>')
            .replace(/```scss([\s\S]*?)```/g, '<pre><code class="language-scss">$1</code></pre>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/\n/g, '<br>');
    }

    initializeEventListeners() {
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => this.sendMessage());
        }
        if (this.messageInput) {
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }
        if (this.newChatButton) {
            this.newChatButton.addEventListener('click', () => this.startNewChat());
        }
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        if (this.botsToggle) {
            this.botsToggle.addEventListener('click', () => this.toggleBotsPanel());
        }
        if (this.compareToggle) {
            this.compareToggle.addEventListener('click', () => this.toggleCompareMode());
        }

        if (this.botsGrid) {
            this.botsGrid.addEventListener('click', (e) => {
                e.preventDefault();
                alert("Please select models using the bottom Quick Select AI section.");
            });
        }

        const closeBots = document.querySelector('.close-bots');
        if (closeBots) {
            closeBots.addEventListener('click', () => {
                if (this.botsPanel) this.botsPanel.classList.remove('active');
                if (this.botsToggle) this.botsToggle.classList.remove('active');
            });
        }

        if (this.carouselPrev) {
            this.carouselPrev.addEventListener('click', () => this.scrollCarousel('prev'));
        }
        if (this.carouselNext) {
            this.carouselNext.addEventListener('click', () => this.scrollCarousel('next'));
        }

        document.querySelector('.login-btn').addEventListener('click', () => this.showAuthModal(true));
        document.querySelector('.signup-btn').addEventListener('click', () => this.showAuthModal(false));
        this.modalSubmit.addEventListener('click', () => {
            const email = this.modalEmail.value.trim();
            const password = this.modalPassword.value.trim();
            if (!email || !password) {
                alert("Email and password are required");
                return;
            }
            if (this.modalTitle.textContent === 'Login') {
                this.loginUser(email, password);
            } else {
                this.signUpUser(email, password);
            }
        });
        this.modalClose.addEventListener('click', () => this.hideAuthModal());
        this.toggleModalAuth.addEventListener('click', () => this.showAuthModal(this.modalTitle.textContent === 'Sign Up'));
        this.logoutBtn.addEventListener('click', () => this.logoutUser());
        


        document.addEventListener('click', (e) => {
            if (this.botsPanel && this.botsToggle && 
                !this.botsPanel.contains(e.target) && !this.botsToggle.contains(e.target)) {
                this.botsPanel.classList.remove('active');
                this.botsToggle.classList.remove('active');
            }
        });
    }

    toggleSidebar() {
        if (this.sidebar) this.sidebar.classList.toggle('active');
    }

    toggleBotsPanel() {
        if (this.botsPanel) this.botsPanel.classList.toggle('active');
        if (this.botsToggle) this.botsToggle.classList.toggle('active');
    }

    toggleCompareMode() {
        // Ensemble Mode is permanently enabled - no toggling allowed
        this.compareMode = true;
        if (this.compareToggle) this.compareToggle.classList.add('active');
        if (this.compareContainer) this.compareContainer.classList.add('active');

        // Ensure we have at least 2 bots selected for ensemble mode
        if (this.selectedBots.length < 2) {
            this.selectedBots = ['llama4-maverick-17b-128e-instruct', 'llama4-scout-17b-16e-instruct'];
        }

        this.updateBotSelection();
    }

    toggleBotSelection(botId) {
        const previousBots = [...this.selectedBots];

        // Always work in ensemble mode (compare mode)
            if (this.selectedBots.includes(botId)) {
                this.selectedBots = this.selectedBots.filter(id => id !== botId);
            } else if (this.selectedBots.length < 3) {
                this.selectedBots.push(botId);
        }

        // If bots changed and there are messages, save and start new chat
        const botsChanged = previousBots.sort().join(',') !== this.selectedBots.sort().join(',');
        if (botsChanged && this.messages.length > 0) {
            this.saveChatHistory();
            this.startNewChat();
        }

        this.updateBotSelection();
        this.updateCarouselSelection();

        const botsPanelVisible = this.botsPanel?.classList.contains("active");
        if (botsPanelVisible) {
            this.botsPanel.classList.remove("active");
            this.botsToggle?.classList.remove("active");
        }
    }

    updateBotSelection() {
        const limitReached = this.selectedBots.length >= 3;

        const botsGrid = document.getElementById('botsGrid');
        if (botsGrid) {
            botsGrid.innerHTML = '';
            this.selectedBots.forEach(botId => {
                const model = this.aiModels[botId];
                if (!model) return;

                // Get current temperature for this bot, or default to 0.7
                const temp = this.modelTemperatures[botId] !== undefined ? this.modelTemperatures[botId] : 0.7;

                const card = document.createElement('div');
                card.className = 'carousel-bot-card selected';
                card.dataset.bot = botId;
                card.innerHTML = `
                    <div class="carousel-bot-icon">${renderModelIcon(model.icon)}</div>
                    <div class="carousel-bot-name">${model.name}</div>
                    <div class="bot-description">${model.description}</div>
                    <div class="bot-temp-slider" style="display:none;">
                        <label style="font-size:0.95em;">Temperature:
                            <input type="range" min="0" max="1.5" step="0.01" value="${temp}" class="temperature-slider" data-botid="${botId}">
                            <span class="temperature-value">${temp}</span>
                        </label>
                    </div>
                `;
                botsGrid.appendChild(card);

                // Show slider on hover
                card.addEventListener('mouseenter', () => {
                    const sliderDiv = card.querySelector('.bot-temp-slider');
                    if (sliderDiv) sliderDiv.style.display = 'block';
                });
                card.addEventListener('mouseleave', () => {
                    const sliderDiv = card.querySelector('.bot-temp-slider');
                    if (sliderDiv) sliderDiv.style.display = 'none';
                });

                // Temperature slider logic
                const slider = card.querySelector('.temperature-slider');
                const valueSpan = card.querySelector('.temperature-value');
                if (slider && valueSpan) {
                    slider.addEventListener('input', (e) => {
                        const val = parseFloat(slider.value);
                        this.modelTemperatures[botId] = val;
                        valueSpan.textContent = val;
                    });
                }
            });

            if (this.selectedBots.length === 0) {
                botsGrid.innerHTML = `<p style="padding: 1rem; color: #999;">No AI models selected. Choose from below.</p>`;
            }
        }

        if (this.carouselTrack) {
            const cards = this.carouselTrack.querySelectorAll('.carousel-bot-card');
            cards.forEach(card => {
                const selected = this.selectedBots.includes(card.dataset.bot);
                card.classList.toggle('selected', selected);
                card.classList.toggle('disabled', limitReached && !selected);
            });
        }
    }

    startNewChat() {
        this.currentChatId = 'chat_' + Date.now();
        this.messages = [];
        if (this.chatMessages) {
            this.chatMessages.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-content">
                        <h2>Welcome to AI Chat Interface</h2>
                        <p>Start a conversation with your AI assistant. Ensemble mode is always active - you'll see responses from multiple AI models simultaneously.</p>
                    </div>
                </div>
            `;
        }
        // Hide compare container completely
        if (this.compareContainer) {
            this.compareContainer.style.display = 'none';
        }
        if (this.compareResponses) this.compareResponses.innerHTML = '';
        if (this.messageInput) this.messageInput.focus();
        this.compareMode = true;
        if (this.compareToggle) this.compareToggle.classList.add('active');
        if (this.compareContainer) this.compareContainer.classList.add('active');
        this.updateBotSelection();
    }

    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        if (!this.selectedBots || this.selectedBots.length === 0) {
            this.addMessage("Please select an AI model before sending a message.", 'ai');
            this.messageInput.value = '';
            return;
        }

        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) welcomeMessage.remove();

        // Show and restore compare container for chat
        if (this.compareContainer) {
            this.compareContainer.style.display = 'block';
            this.compareContainer.style.maxHeight = '400px';
            this.compareContainer.style.padding = '1rem';
            this.compareContainer.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';
            this.compareContainer.style.overflowY = 'auto';
            this.compareContainer.style.border = '';
            this.compareContainer.style.overflow = '';
        }

        // Save the user message to chat history (so it appears in history view)
        this.messages.push({
            content: message,
            sender: 'user',
            timestamp: Date.now()
        });

        this.messageInput.value = '';
        this.sendButton.disabled = true;

        // Always use ensemble mode
        this.handleCompareMode(message);
    }

    async handleSingleResponse(message) {
        this.showTypingIndicator();

        const botId = this.selectedBots[0];
        if (!botId || !this.aiModels[botId]) {
            this.hideTypingIndicator();
            this.addMessage("No valid AI model selected. Please choose a model.", 'ai');
            this.sendButton.disabled = false;
            return;
        }

        setTimeout(async () => {
            this.hideTypingIndicator();
            const response = await this.generateAIResponse(message, botId);
            this.addMessage(response, 'ai', botId);
            this.sendButton.disabled = false;
        }, Math.random() * 2000 + 1000);
    }

    handleCompareMode(message) {
        // Clear previous responses
       // this.compareResponses.innerHTML = '';

        // 1. Create a wrapper for this turn
        const turnDiv = document.createElement('div');
        turnDiv.className = 'compare-turn';

        // 2. User message
        const userMsgDiv = document.createElement('div');
        userMsgDiv.className = 'compare-user-message';
        // ... (add bubble and timestamp as before)
        turnDiv.appendChild(userMsgDiv);

        // Get the current time in HH:MM format
        const currentTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        userMsgDiv.innerHTML = `
            <div class="compare-user-bubble">
                <span>${this.escapeHtml(message)}</span>
            </div>
            <div class="compare-user-time">${currentTime}</div>
        `;

        // 3. Grid for AI responses
        const grid = document.createElement('div');
        grid.className = 'compare-responses-grid';
        turnDiv.appendChild(grid);

        // 4. Append this turn to the main compareResponses container (do NOT clear it!)
        this.compareResponses.appendChild(turnDiv);

        // Add all compare responses to the grid
        this.selectedBots.forEach((botId, index) => {
            const responseDiv = document.createElement('div');
            responseDiv.className = 'compare-response';
            responseDiv.innerHTML = `
                <div class="compare-response-header">
                    <div class="compare-response-icon">${renderModelIcon(this.aiModels[botId].icon)}</div>
                    <div class="compare-response-name">
                        <span class="bot-name-text">${this.aiModels[botId].name}</span>
                        <button class="compare-popout-btn" title="Expand this response"> Expand</button>
                    </div>
                </div>
                <div class="compare-response-content">
                    <div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            `;
            grid.appendChild(responseDiv);

            setTimeout(async () => {
                const startTime = Date.now();
                // Use the selected temperature for this bot
                const temperature = this.modelTemperatures[botId] !== undefined ? this.modelTemperatures[botId] : 0.7;
                // Get the full result object (not just text)
                const cerebrasResult = await cerebrasAPI.generateResponse(message, {
                    maxTokens: 1000,
                    temperature: temperature,
                    model: botId
                });
                const endTime = Date.now();
                const responseTime = endTime - startTime; // ms

                // Use formatAnswer to parse Markdown to HTML
                const formattedResponse = this.formatAnswer(cerebrasResult.text || cerebrasResult);

                // Build usage/parameter HTML
                const temperatureUsed = this.modelTemperatures[botId] !== undefined ? this.modelTemperatures[botId] : 0.7;
                let temperatureHtml = `<div class="parameter-highlight">
                    <span class="parameter-label">Temperature Used:</span>
                    <span class="parameter-value">${temperatureUsed}</span>
                </div>`;
                let usageHtml = '';
                if (cerebrasResult.usage) {
                    usageHtml = '<div class="response-usage"><strong>Parameters:</strong><br>';
                    for (const [key, value] of Object.entries(cerebrasResult.usage)) {
                        if (key === 'prompt_tokens_details') continue; // Skip this parameter
                        let displayValue = value;
                        if (typeof value === 'object') {
                            displayValue = `<pre style="display:inline;white-space:pre-wrap;">${JSON.stringify(value, null, 2)}</pre>`;
                        }
                        usageHtml += `<span>${key}: ${displayValue}</span><br>`;
                    }
                    usageHtml += '</div>';
                }
                // Optionally, display other top-level parameters (like id, finish_reason, etc.)
                let otherParamsHtml = '';
                const skipKeys = ['text', 'usage', 'model', 'success']; // don't repeat these
                for (const [key, value] of Object.entries(cerebrasResult)) {
                    if (!skipKeys.includes(key)) {
                        otherParamsHtml += `<div class="response-param"><strong>${key}:</strong> ${typeof value === 'object' ? JSON.stringify(value) : value}</div>`;
                    }
                }
                let timeHtml = `<div class="response-time">Time: ${responseTime} ms</div>`;

                responseDiv.querySelector('.compare-response-content').innerHTML = formattedResponse + temperatureHtml + usageHtml + otherParamsHtml + timeHtml;

                // Highlight code blocks if highlight.js is available
                if (window.hljs) {
                    responseDiv.querySelectorAll('.compare-response-content pre code').forEach((block) => {
                        window.hljs.highlightElement(block);
                    });
                }
                // Add the AI response to messages array for saving to Firebase
                this.messages.push({
                    content: cerebrasResult.text || cerebrasResult,
                    sender: 'ai',
                    botId: botId,
                    timestamp: Date.now()
                });
                // If popout modal is open for this bot, update it if it's showing this bot
                const modal = document.getElementById('comparePopoutModal');
                const contentArea = document.getElementById('comparePopoutContentArea');
                if (modal && contentArea && modal.classList.contains('active')) {
                    const nameDiv = contentArea.querySelector('.compare-response-name');
                    if (nameDiv && nameDiv.textContent === this.aiModels[botId].name) {
                        contentArea.innerHTML = `<div class='compare-response-header'><div class='compare-response-icon'>${renderModelIcon(this.aiModels[botId].icon)}</div><div class='compare-response-name'>${this.aiModels[botId].name}</div></div><div class='compare-response-content'>${formattedResponse}</div>`;
                        // Highlight code blocks in modal
                        if (window.hljs) {
                            contentArea.querySelectorAll('.compare-response-content pre code').forEach((block) => {
                                window.hljs.highlightElement(block);
                            });
                        }
                    }
                }
                if (index === this.selectedBots.length - 1) {
                    this.sendButton.disabled = false;
                    // Save chat history after all responses are complete
                    this.saveChatHistory();
                }
            }, Math.random() * 2000 + 1000 + (index * 500));

            const popoutBtn = responseDiv.querySelector('.compare-popout-btn');
            popoutBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const modal = document.getElementById('comparePopoutModal');
                const contentArea = document.getElementById('comparePopoutContentArea');
                if (modal && contentArea) {
                    // Use formatAnswer for the modal as well
                    const responseHtml = responseDiv.querySelector('.compare-response-content').innerHTML;
                    contentArea.innerHTML = `<div class="compare-popout-header" style="display:flex;align-items:center;gap:0.7em;margin-bottom:1em;">
        <span class="compare-popout-icon" style="font-size:2rem;">${renderModelIcon(this.aiModels[botId].icon)}</span>
        <span class="compare-popout-name" style="font-weight:600;font-size:1.2rem;">${this.aiModels[botId].name}</span>
    </div>
    <div class='compare-response-content'>${responseHtml}</div>`;
                    // Highlight code blocks in modal
                    if (window.hljs) {
                        contentArea.querySelectorAll('.compare-response-content pre code').forEach((block) => {
                            window.hljs.highlightElement(block);
                        });
                    }
                    modal.classList.add('active');
                }
            });

            // Modal close event
            const modal = document.getElementById('comparePopoutModal');
            const closeBtn = document.getElementById('closeComparePopout');
            if (modal && closeBtn) {
                closeBtn.onclick = () => {
                    modal.classList.remove('active');
                    const contentArea = document.getElementById('comparePopoutContentArea');
                    if (contentArea) contentArea.innerHTML = '';
                };
            }
        });
    }

    addMessage(content, sender, botId = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const currentTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        if (sender === 'user') {
            messageDiv.innerHTML = `
                <div class="message-content">${this.escapeHtml(content)}</div>
                <div class="message-time">${currentTime}</div>
            `;
        } else {
            const botName = botId ? this.aiModels[botId].name : 'AI Assistant';
            const botIcon = botId ? this.aiModels[botId].icon : '🤖';
            messageDiv.innerHTML = `
                <div class="message-content">
                    <strong>${botIcon} ${botName}:</strong>
                    <div>${this.formatAnswer(content)}</div>
                </div>
                <div class="message-time">${currentTime}</div>
            `;
        }

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();

        this.messages.push({
            content,
            sender,
            botId,
            timestamp: Date.now()
        });
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-content typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) typingIndicator.remove();
    }

    // Update generateAIResponse to accept temperature
    async generateAIResponse(userMessage, botId, temperatureOverride) {
        const model = this.aiModels[botId];
        const lowerMessage = userMessage.toLowerCase();

        // Check for FAQ answer first
        const faqAnswer = this.getFaqAnswer(userMessage, this.faqs, this.personalityFaqs);
        if (faqAnswer) return faqAnswer;

        // Handle Cerebras API calls for all supported models
        const cerebrasModelKeys = [
            'llama3-8b',
            'llama3-70b',
            'llama4-scout-17b-16e-instruct',
            'llama4-maverick-17b-128e-instruct',
            'qwen-3-32b',
            'qwen-3-235b-a22b'
        ];
        if (cerebrasModelKeys.includes(botId)) {
            try {
                console.log('🤖 Calling Cerebras API for model:', botId);
                const cerebrasResult = await cerebrasAPI.generateResponse(userMessage, {
                    maxTokens: 1000,
                    temperature: temperatureOverride !== undefined ? temperatureOverride : (this.modelTemperatures[botId] || 0.7),
                    model: botId
                });
                if (cerebrasResult.success) {
                    return cerebrasResult.text;
                } else {
                    console.error('Cerebras API error:', cerebrasResult.error);
                    return `Sorry, I couldn't get a response from Cerebras: ${cerebrasResult.error}`;
                }
            } catch (error) {
                console.error('Error calling Cerebras API:', error);
                return `Sorry, there was an error connecting to Cerebras: ${error.message}`;
            }
        }

        // Handle other AI models with predefined responses
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return `Hello! I'm ${model.name}, your AI assistant. ${model.description}. How can I help you today?`;
        } else if (lowerMessage.includes('how are you')) {
            return `I'm doing great, thank you for asking! As ${model.name}, I'm here and ready to assist you with any questions or tasks you might have.`;
        } else if (lowerMessage.includes('what can you do')) {
            return `As ${model.name}, I can help you with a wide variety of tasks. ${model.description}. What would you like to explore?`;
        } else if (lowerMessage.includes('joke')) {
            const jokes = {
                'gpt-4': "Why don't web developers prefer dark mode? Because the light attracts bugs! *adjusts digital glasses analytically*",
                'claude': "I'd be happy to share a joke! Why don't web developers prefer dark mode? Because the light attracts bugs! Hope that brought a smile to your face!",
                'gemini': "Ooh, I love jokes! Here's a creative one: Why don't web developers prefer dark mode? Because the light attracts bugs! *sparkles with digital creativity*"
            };
            return jokes[botId] || jokes['gpt-4'];
        } else if (lowerMessage.includes('thank')) {
            return `You're very welcome! I'm glad I could help. Feel free to ask me anything else you'd like to know!`;
        } else {
            const responses = model.responses;
            return responses[Math.floor(Math.random() * responses.length)];
        }
    }

    saveChatHistory() {
        // Use Firebase if user is authenticated, otherwise use localStorage as fallback
        const user = this.auth.currentUser;
        if (user) {
            this.saveChatHistoryToFirebase();
        } else {
            // Fallback to localStorage for non-authenticated users
        if (this.messages.length > 0) {
            const existingChatIndex = this.chatHistory.findIndex(chat => chat.id === this.currentChatId);
            const chatData = {
                id: this.currentChatId,
                title: this.messages[0].content.substring(0, 30) + (this.messages[0].content.length > 30 ? '...' : ''),
                messages: this.messages,
                lastUpdated: Date.now()
            };

            if (existingChatIndex !== -1) {
                this.chatHistory[existingChatIndex] = chatData;
            } else {
                this.chatHistory.unshift(chatData);
            }

            this.chatHistory = this.chatHistory.slice(0, 20);
            localStorage.setItem('chatHistory', JSON.stringify(this.chatHistory));
            this.renderChatHistory();
            }
        }
    }

    renderChatHistory() {
        this.chatHistoryList.innerHTML = '';
        
        this.chatHistory.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-history-item';
            
            // Check if this chat is currently active
            if (chat.id === this.currentChatId) {
                chatItem.classList.add('active');
            }

            const lastMessage = chat.messages[chat.messages.length - 1];
            const preview = lastMessage ? lastMessage.content.substring(0, 50) + '...' : '';

            chatItem.innerHTML = `
                <div class="chat-item-content">
                <div class="chat-item-title">${chat.title}</div>
                <div class="chat-item-preview">${preview}</div>
                </div>
                <button class="delete-chat-btn" title="Delete chat">🗑️</button>
            `;

            // Add click event for loading chat
            const chatContent = chatItem.querySelector('.chat-item-content');
            chatContent.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Clear ALL existing content and load the selected chat
                this.chatMessages.innerHTML = '';
                if (this.compareResponses) {
                    this.compareResponses.innerHTML = '';
                }
                if (this.compareContainer) {
                    const compareResponses = this.compareContainer.querySelector('.compare-responses');
                    if (compareResponses) {
                        compareResponses.innerHTML = '';
                    }
                }
                this.loadChat(chat);
            });
            
            // Add click event for deleting chat
            const deleteBtn = chatItem.querySelector('.delete-chat-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this chat?')) {
                    this.deleteChatFromFirebase(chat.id);
                }
            });

            this.chatHistoryList.appendChild(chatItem);
        });
    }

    loadChat(chat) {
        this.currentChatId = chat.id;

        // Hide the compare container when loading chat history
        if (this.compareContainer) {
            this.compareContainer.style.display = 'none';
        }
        this.messages = [...chat.messages]; // Create a copy to avoid reference issues
        
        // Clear ALL existing content - chat messages, compare responses, and welcome messages
        this.chatMessages.innerHTML = '';
        
        // Also clear the compare responses container (where AI model cards are displayed)
        if (this.compareResponses) {
            this.compareResponses.innerHTML = '';
        }
        
        // Clear any compare container content
        if (this.compareContainer) {
            // Keep the container but clear its content
            const compareResponses = this.compareContainer.querySelector('.compare-responses');
            if (compareResponses) {
                compareResponses.innerHTML = '';
            }
        }
        
        // Remove any welcome message that might be present
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        // DEBUG: Log messages array
        console.log('Loaded messages:', this.messages);
        
        // Group messages into turns: [{user, timestamp, bots: [aiMsg, aiMsg, ...]}]
        let i = 0;
        let rendered = false;
        while (i < this.messages.length) {
            if (this.messages[i].sender === 'user') {
                const userMsg = this.messages[i];
                const bots = [];
                let j = i + 1;
                // Collect all following ai messages until the next user message or end
                while (j < this.messages.length && this.messages[j].sender === 'ai') {
                    bots.push(this.messages[j]);
                    j++;
                }
                // Render this turn (even if bots is empty)
                this.renderCompareTurn(userMsg, bots);
                rendered = true;
                i = j;
            } else {
                // If for some reason there's an ai message not after a user, skip it
                i++;
            }
        }
        // Fallback: if nothing rendered, show all messages as before
        if (!rendered) {
            this.messages.forEach(message => {
                this.addMessageToDisplay(message);
            });
        }
        
        // Update the chat history display to show which chat is active
        this.renderChatHistory();
        
        // Scroll to bottom
        this.scrollToBottom();
    }

    addMessageToDisplay(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender}-message`;

        const messageTime = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        if (message.sender === 'user') {
            messageDiv.innerHTML = `
                <div class="message-content">${this.escapeHtml(message.content)}</div>
                <div class="message-time">${messageTime}</div>
            `;
        } else {
            const botName = message.botId ? this.aiModels[message.botId].name : 'AI Assistant';
            const botIcon = message.botId ? this.aiModels[message.botId].icon : '🤖';
            messageDiv.innerHTML = `
                <div class="message-content">
                    <strong>${botIcon} ${botName}:</strong>
                    <div>${this.formatAnswer(message.content)}</div>
                </div>
                <div class="message-time">${messageTime}</div>
            `;
        }

        this.chatMessages.appendChild(messageDiv);
    }

    renderCompareTurn(userMsg, bots) {
        // Create turn container
        const turnDiv = document.createElement('div');
        turnDiv.className = 'chat-turn';

        // User message
        const userDiv = document.createElement('div');
        userDiv.className = 'chat-user-message';
        userDiv.innerHTML = `
            <div class="chat-user-bubble">${this.escapeHtml(userMsg.content)}</div>
            <div class="chat-user-time">${new Date(userMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        `;
        turnDiv.appendChild(userDiv);

        // Bot responses (use compare-response structure)
        const botsDiv = document.createElement('div');
        botsDiv.className = 'chat-bot-responses';
        bots.forEach(botMsg => {
            const botDiv = document.createElement('div');
            botDiv.className = 'compare-response';
            botDiv.innerHTML = `
                <div class="compare-response-header">
                    <div class="compare-response-icon">${renderModelIcon(botMsg.botId ? this.aiModels[botMsg.botId].icon : '🤖')}</div>
                    <div class="compare-response-name">
                        ${botMsg.botId ? this.aiModels[botMsg.botId].name : 'AI Assistant'}
                        <button class="compare-popout-btn" title="Expand this response">Expand</button>
                    </div>
                </div>
                <div class="compare-response-content">
                    ${this.formatAnswer(botMsg.content)}
                </div>
            `;
            // Add expand button logic
            const popoutBtn = botDiv.querySelector('.compare-popout-btn');
            popoutBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const modal = document.getElementById('comparePopoutModal');
                const contentArea = document.getElementById('comparePopoutContentArea');
                if (modal && contentArea) {
                    contentArea.innerHTML = `
                        <div class="compare-popout-header" style="display:flex;align-items:center;gap:0.7em;margin-bottom:1em;">
                            <span class="compare-popout-icon" style="font-size:2rem;">${renderModelIcon(botMsg.botId ? this.aiModels[botMsg.botId].icon : '🤖')}</span>
                            <span class="compare-popout-name" style="font-weight:600;font-size:1.2rem;">${botMsg.botId ? this.aiModels[botMsg.botId].name : 'AI Assistant'}</span>
                        </div>
                        <div class='compare-response-content'>${this.formatAnswer(botMsg.content)}</div>
                    `;
                    // Highlight code blocks in modal
                    if (window.hljs) {
                        contentArea.querySelectorAll('.compare-response-content pre code').forEach((block) => {
                            window.hljs.highlightElement(block);
                        });
                    }
                    modal.classList.add('active');
                }
            });
            botsDiv.appendChild(botDiv);
        });
        turnDiv.appendChild(botsDiv);

        // Add to chatMessages
        this.chatMessages.appendChild(turnDiv);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    initializeCarousel() {
        if (!this.carouselTrack) return;

        this.carouselTrack.innerHTML = '';

        Object.keys(this.aiModels).forEach(botId => {
            const model = this.aiModels[botId];
            const temp = this.modelTemperatures && this.modelTemperatures[botId] !== undefined ? this.modelTemperatures[botId] : 0.7;
            const botCard = document.createElement('div');
            botCard.className = 'carousel-bot-card';
            botCard.dataset.bot = botId;

            botCard.innerHTML = `
                <div class="carousel-bot-icon">${renderModelIcon(model.icon)}</div>
                <div class="carousel-bot-name">${model.name}</div>
                <div class="bot-temp-slider" style="display:none;">
                    <label style="font-size:0.95em;">Temperature:
                        <input type="range" min="0" max="1" step="0.01" value="${temp}" class="temperature-slider" data-botid="${botId}">
                        <span class="temperature-value">${temp}</span>
                    </label>
                </div>
            `;

            // Show slider on hover for selected cards only, with 1s delay before hiding
            let hideSliderTimeout = null;
            botCard.addEventListener('mouseenter', () => {
                if (botCard.classList.contains('selected')) {
                    const sliderDiv = botCard.querySelector('.bot-temp-slider');
                    if (sliderDiv) {
                        clearTimeout(hideSliderTimeout);
                        sliderDiv.style.display = 'block';
                    }
                }
            });
            botCard.addEventListener('mouseleave', () => {
                const sliderDiv = botCard.querySelector('.bot-temp-slider');
                if (sliderDiv) {
                    hideSliderTimeout = setTimeout(() => {
                        sliderDiv.style.display = 'none';
                    }, 90); // 1 second delay
                }
            });
            // Also keep the slider visible if the mouse enters the slider itself
            const sliderDiv = botCard.querySelector('.bot-temp-slider');
            if (sliderDiv) {
                sliderDiv.addEventListener('mouseenter', () => {
                    clearTimeout(hideSliderTimeout);
                    sliderDiv.style.display = 'block';
                });
                sliderDiv.addEventListener('mouseleave', () => {
                    hideSliderTimeout = setTimeout(() => {
                        sliderDiv.style.display = 'none';
                    }, 1000); // 1 second delay
                });
            }

            // Temperature slider logic
            const slider = botCard.querySelector('.temperature-slider');
            const valueSpan = botCard.querySelector('.temperature-value');
            if (slider && valueSpan) {
                slider.addEventListener('input', (e) => {
                    const val = parseFloat(slider.value);
                    this.modelTemperatures[botId] = val;
                    valueSpan.textContent = val;
                });
                // Prevent slider interaction from toggling bot selection
                slider.addEventListener('mousedown', (e) => { e.stopPropagation(); });
                slider.addEventListener('click', (e) => { e.stopPropagation(); });
            }
            const label = botCard.querySelector('.bot-temp-slider label');
            if (label) {
                label.addEventListener('mousedown', (e) => { e.stopPropagation(); });
                label.addEventListener('click', (e) => { e.stopPropagation(); });
            }

            botCard.addEventListener('click', () => this.toggleBotSelection(botId));
            this.carouselTrack.appendChild(botCard);
        });

        this.updateCarouselSelection();
    }

    updateCarouselSelection() {
        if (!this.carouselTrack) return;

        const botCards = this.carouselTrack.querySelectorAll('.carousel-bot-card');
        botCards.forEach(card => {
            const isSelected = this.selectedBots.includes(card.dataset.bot);
            card.classList.toggle('selected', isSelected);
        });
    }

    scrollCarousel(direction) {
        if (!this.carouselTrack) return;

        const scrollAmount = 140;
        const currentScroll = this.carouselTrack.scrollLeft;
        
        if (direction === 'next') {
            this.carouselTrack.scrollTo({ left: currentScroll + scrollAmount, behavior: 'smooth' });
        } else {
            this.carouselTrack.scrollTo({ left: currentScroll - scrollAmount, behavior: 'smooth' });
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            if (this.chatMessages) this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    showChatArea() {
        this.authButtons.querySelector('.login-btn').style.display = 'none';
        this.authButtons.querySelector('.signup-btn').style.display = 'none';
        this.authButtons.querySelector('.logout-btn').style.display = 'block';
        this.chatMessages.style.display = 'block';
        this.messageInput.style.display = 'inline';
        this.sendButton.style.display = 'flex';
        // Hide compare container completely
        if (this.compareContainer) {
            this.compareContainer.style.display = 'none';
        }
        this.chatMessages.innerHTML = '';
        
        // Only start a new chat if there's no current chat loaded
        if (!this.currentChatId || this.messages.length === 0) {
            this.startNewChat(); // This will show the welcome message for logged-in users
        }
    }

    hideChatArea() {
        this.authButtons.querySelector('.login-btn').style.display = 'block';
        this.authButtons.querySelector('.signup-btn').style.display = 'block';
        this.authButtons.querySelector('.logout-btn').style.display = 'none';
        this.chatMessages.style.display = 'block';
        this.messageInput.style.display = 'none';
        this.sendButton.style.display = 'none';
        
        // Show login message
        this.chatMessages.innerHTML = `
            <div class="login-message">
                <div class="login-message-content">
                    <h2>🔐 Welcome to Prudence AI</h2>
                    <p>Please login or signup to start chatting with our AI models.</p>
                    <div class="login-actions">
                        <button class="login-action-btn" onclick="document.querySelector('.login-btn').click()">Login</button>
                        <button class="login-action-btn" onclick="document.querySelector('.signup-btn').click()">Sign Up</button>
                    </div>
                </div>
            </div>
        `;
    }
}

// Helper function to render icon as <img> if it's a file path, or as text otherwise
function renderModelIcon(icon) {
    if (typeof icon === 'string' && (icon.endsWith('.svg') || icon.endsWith('.png'))) {
        return `<img src='${icon}' class='model-svg-icon' style='width:32px;height:32px;vertical-align:middle;' alt='AI Model Icon' />`;
    } else {
        return icon;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ChatInterface();
    initializeThemeToggle();
});

// Close popup when clicking outside the modal content
document.addEventListener('mousedown', function(event) {
    const modal = document.getElementById('comparePopoutModal');
    const content = document.querySelector('.compare-popout-content');
    if (modal && content && modal.classList.contains('active')) {
        if (!content.contains(event.target)) {
            modal.classList.remove('active');
            const contentArea = document.getElementById('comparePopoutContentArea');
            if (contentArea) contentArea.innerHTML = '';
        }
    }
});
