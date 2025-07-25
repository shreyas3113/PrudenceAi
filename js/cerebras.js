// Cerebras API Integration
// This file handles all Cerebras API calls and response processing
//
// SETUP INSTRUCTIONS:
// 1. Get your Cerebras API key from: https://modelzoo.cerebras.net/
// 2. Replace 'YOUR_CEREBRAS_API_KEY' with your actual API key
// 3. Replace 'YOUR_CEREBRAS_API_ENDPOINT' with your actual endpoint URL
// 4. Adjust the model name if needed (default: 'cerebras-llm')
//
// Example configuration:
// this.apiKey = 'sk-your-actual-api-key-here';
// this.apiEndpoint = 'https://api.cerebras.net/v1/completions';
//
// TESTING:
// After setup, you can test the connection by calling:
// cerebrasAPI.testConnection().then(success => console.log('Test result:', success));

class CerebrasAPI {
    constructor() {
        // Cerebras API Configuration
        this.apiKey = 'csk-fd3f2jnn9mmfhx5j8hccpf8d6njvtychkjk95dyt4rxdjhxk'; // Your actual API key
        this.apiEndpoint = 'https://api.cerebras.ai/v1/chat/completions'; // Updated Cerebras endpoint
        this.model = 'cerebras-llm'; // Default model name, adjust as needed
    }

    // Set API credentials (call this after getting your credentials)
    setCredentials(apiKey, apiEndpoint, model = 'cerebras-llm') {
        this.apiKey = apiKey;
        this.apiEndpoint = apiEndpoint;
        this.model = model;
        console.log('✅ Cerebras API credentials configured');
    }

    // Try alternative endpoints if the main one fails
    async tryAlternativeEndpoints(prompt, options) {
        const endpoints = [
            'https://api.cerebras.ai/v1/chat/completions',
            'https://api.cerebras.ai/v1/completions'
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`🔄 Trying endpoint: ${endpoint}`);
                
                const requestPayload = {
                    messages: [
                        {
                            role: "system",
                            content: ""
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    model: 'llama-4-scout-17b-16e-instruct',
                    stream: false,
                    max_completion_tokens: options.maxTokens || 2048,
                    temperature: options.temperature || 0.2,
                    top_p: 1
                };

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(requestPayload)
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ Success with endpoint: ${endpoint}`);
                    
                    let responseText = '';
                    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                        responseText = data.choices[0].message.content.trim();
                    } else if (data.choices && data.choices[0] && data.choices[0].text) {
                        responseText = data.choices[0].text.trim();
                    } else if (data.text) {
                        responseText = data.text.trim();
                    } else {
                        responseText = 'No response generated from Cerebras.';
                    }

                    return {
                        success: true,
                        text: responseText,
                        model: this.model,
                        endpoint: endpoint,
                        usage: data.usage || null
                    };
                }
            } catch (error) {
                console.log(`❌ Failed with endpoint ${endpoint}:`, error.message);
                continue;
            }
        }
        
        throw new Error('All Cerebras API endpoints failed');
    }

    // Main method to generate response from Cerebras
    async generateResponse(prompt, options = {}) {
        try {
            if (!this.apiKey || this.apiKey === 'YOUR_CEREBRAS_API_KEY') {
                throw new Error('Cerebras API key not configured. Please set your API credentials.');
            }

            if (!this.apiEndpoint || this.apiEndpoint === 'YOUR_CEREBRAS_API_ENDPOINT') {
                throw new Error('Cerebras API endpoint not configured. Please set your API endpoint.');
            }

            const modelName = options.model || 'llama-4-scout-17b-16e-instruct';

            console.log('🤖 Calling Cerebras API...');
            console.log('🔗 Endpoint:', this.apiEndpoint);
            console.log('🔑 API Key:', this.apiKey.substring(0, 10) + '...');
            console.log('🧠 Model:', modelName);

            // Prepare the request payload using the correct Cerebras format
            const requestPayload = {
                messages: [
                    {
                        role: "system",
                        content: ""
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                model: modelName, // Use the selected model
                stream: false, // Set to false for non-streaming
                max_completion_tokens: options.maxTokens || 2048,
                temperature: options.temperature || 0.2,
                top_p: 1
            };

            console.log('📤 Request payload:', JSON.stringify(requestPayload, null, 2));

            // Make the API call
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestPayload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Cerebras API Error: ${response.status} - ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            
            // Extract the response text from chat completions format
            let responseText = '';
            if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                responseText = data.choices[0].message.content.trim();
            } else if (data.choices && data.choices[0] && data.choices[0].text) {
                responseText = data.choices[0].text.trim();
            } else if (data.text) {
                responseText = data.text.trim();
            } else if (data.response) {
                responseText = data.response.trim();
            } else {
                responseText = 'No response generated from Cerebras.';
            }

            console.log('✅ Cerebras response received');
            return {
                success: true,
                text: responseText,
                model: this.model,
                usage: data.usage || null
            };

        } catch (error) {
            console.error('❌ Primary Cerebras API Error:', error.message);
            console.log('🔄 Trying alternative endpoints...');
            
            try {
                const fallbackResult = await this.tryAlternativeEndpoints(prompt, options);
                return fallbackResult;
            } catch (fallbackError) {
                console.error('❌ All Cerebras API endpoints failed:', fallbackError.message);
                return {
                    success: false,
                    error: fallbackError.message,
                    text: `Sorry, I couldn't get a response from Cerebras: ${fallbackError.message}`
                };
            }
        }
    }

    // Test the API connection
    async testConnection() {
        try {
            const result = await this.generateResponse('Hello, this is a test message.', { maxTokens: 50 });
            if (result.success) {
                console.log('✅ Cerebras API connection test successful');
                return true;
            } else {
                console.log('❌ Cerebras API connection test failed:', result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ Cerebras API connection test failed:', error);
            return false;
        }
    }

    // Test different model names
    async testModelNames() {
        const modelNames = [
            'llama-4-scout-17b-16e-instruct',
            'llama-4-scout-17b-16e',
            'llama-4-scout-17b',
            'cerebras-llm-13b',
            'cerebras-llm-7b'
        ];

        for (const modelName of modelNames) {
            try {
                console.log(`🧪 Testing model: ${modelName}`);
                
                const requestPayload = {
                    messages: [
                        {
                            role: "system",
                            content: ""
                        },
                        {
                            role: "user",
                            content: "Hello"
                        }
                    ],
                    model: modelName,
                    stream: false,
                    max_completion_tokens: 50,
                    temperature: 0.2,
                    top_p: 1
                };

                const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(requestPayload)
                });

                if (response.ok) {
                    console.log(`✅ Model ${modelName} works!`);
                    return modelName;
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.log(`❌ Model ${modelName} failed: ${response.status} - ${errorData.error || response.statusText}`);
                }
            } catch (error) {
                console.log(`❌ Model ${modelName} error:`, error.message);
            }
        }
        
        console.log('❌ No working model found');
        return null;
    }

    // Get API status
    getStatus() {
        return {
            configured: this.apiKey !== 'YOUR_CEREBRAS_API_KEY' && this.apiEndpoint !== 'YOUR_CEREBRAS_API_ENDPOINT',
            hasApiKey: this.apiKey !== 'YOUR_CEREBRAS_API_KEY',
            hasEndpoint: this.apiEndpoint !== 'YOUR_CEREBRAS_API_ENDPOINT'
        };
    }
}

// Create and export a singleton instance
const cerebrasAPI = new CerebrasAPI();

export { cerebrasAPI, CerebrasAPI }; 