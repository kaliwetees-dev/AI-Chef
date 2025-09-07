import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { dishName, servings } = req.body;
    const textApiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
    const textApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${textApiKey}`;

    if (!dishName || !servings || isNaN(parseInt(servings))) {
        return res.status(400).json({ error: "Please provide a dish name and a valid number of servings." });
    }

    const textPayload = {
        contents: [{
            parts: [{
                text: `Provide a recipe for "${dishName}" with all ingredients scaled to serve exactly ${servings} people. The response should be a JSON object with "isRecipeFound": true, the recipe name, the number of servings, a list of ingredients with adjusted measurements, and a list of cooking process steps. If it is not a food item or a recipe cannot be found, the response should be a JSON object with "isRecipeFound": false and a "message" field explaining why. Do not include any additional text or markdown outside of the JSON.`
            }]
        }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    isRecipeFound: { type: "BOOLEAN" },
                    message: { type: "STRING" },
                    recipeName: { type: "STRING" },
                    servings: { type: "NUMBER" },
                    ingredients: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    },
                    process: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    }
                },
                "propertyOrdering": ["isRecipeFound", "message", "recipeName", "servings", "ingredients", "process"]
            }
        },
        systemInstruction: {
            parts: [{
                text: "You are a friendly and encouraging professional chef's assistant. Your job is to provide clear, delicious-sounding recipes based on user requests. Your tone should be warm, helpful, and welcoming."
            }]
        }
    };
    
    try {
        const textResponse = await fetch(textApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(textPayload)
        });

        if (!textResponse.ok) {
            throw new Error(`Text API error! Status: ${textResponse.status}`);
        }

        const textResult = await textResponse.json();
        const jsonString = textResult?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!jsonString) {
            return res.status(500).json({ error: "Could not get a valid recipe from the API." });
        }
        
        const data = JSON.parse(jsonString);
        res.status(200).json(data);
    } catch (error) {
        console.error("Fetch error:", error);
        res.status(500).json({ error: "Failed to fetch recipe. Please try again later." });
    }
}
