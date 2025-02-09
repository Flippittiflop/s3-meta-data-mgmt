import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export function initializeOpenAI(apiKey: string) {
    openaiClient = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
    });
}

export async function analyzeImage(
    file: File,
    fields: Array<{ name: string; type: string }>
): Promise<Record<string, any>> {
    if (!openaiClient) {
        throw new Error('OpenAI client not initialized');
    }

    try {
        // Convert File to base64
        const base64Image = await fileToBase64(file);

        // Create a prompt that describes what we want to extract
        const fieldDescriptions = fields.map(field =>
            `${field.name} (${field.type})`
        ).join(', ');

        const response = await openaiClient.chat.completions.create({
            model: "gpt-4o-mini",  // Updated to use the correct model
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this image and provide values for the following fields: ${fieldDescriptions}. Return ONLY a JSON object with the field names as keys and appropriate values based on the image content.`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: base64Image
                            }
                        }
                    ]
                }
            ],
            max_tokens: 300
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        // Extract JSON from the response
        const jsonMatch = content.match(/```json\s*(\{[\s\S]*\})\s*```/) ||
            content.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error('No JSON found in OpenAI response');
        }

        const jsonContent = jsonMatch[1] || jsonMatch[0];

        try {
            // Parse the extracted JSON
            return JSON.parse(jsonContent);
        } catch (e) {
            console.error('Failed to parse JSON:', content);
            throw new Error(`Failed to parse OpenAI response: ${content}`);
        }
    } catch (error) {
        // Only throw the error, let the caller handle the logging and notifications
        throw error;
    }
}

async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to convert file to base64'));
            }
        };
        reader.onerror = error => reject(error);
    });
}
