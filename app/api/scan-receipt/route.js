import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(request) {
    try {
        const formData = await request.formData()
        const file = formData.get('receipt')

        if (!file) {
            return NextResponse.json(
                { error: 'No receipt file provided.' },
                { status: 400 }
            )
        }

        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer()
        const base64String = Buffer.from(arrayBuffer).toString('base64')
        const mimeType = file.type || 'image/jpeg'

        const prompt = `Analyze this receipt image. Extract the following three pieces of information and return them strictly as a clean JSON object with these exact keys: 'productName' (string, name of the main item bought), 'purchaseDate' (string formatted as YYYY-MM-DD), and 'expiryDate' (string formatted as YYYY-MM-DD, calculating it based on standard warranty rules or text visible on the invoice if present). Do not wrap the response in markdown blocks or text explanations.`

        let response
        try {
            response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    {
                        parts: [
                            {
                                inlineData: {
                                    mimeType,
                                    data: base64String,
                                },
                            },
                            {
                                text: prompt,
                            },
                        ],
                    },
                ],
            })
            console.log("Raw API Response:", response)
        } catch (apiError) {
            console.error("Parsing Error Details:", apiError)
            const status = apiError.status || apiError.statusCode || 500
            let userFriendlyMsg = 'AI scanner is experiencing high demand right now. Please try again in a moment or fill in details manually.'

            const rawMsg = (apiError.message || '').toLowerCase()
            if (rawMsg.includes('429') || rawMsg.includes('quota') || rawMsg.includes('limit') || rawMsg.includes('resource_exhausted')) {
                userFriendlyMsg = 'AI scan limit reached for today. Please fill in details manually or try again tomorrow.'
            } else if (rawMsg.includes('503') || rawMsg.includes('unavailable') || rawMsg.includes('high demand') || rawMsg.includes('temporary')) {
                userFriendlyMsg = 'AI scanner is experiencing high demand right now. Please try again in a moment or fill in details manually.'
            }

            return NextResponse.json(
                { error: userFriendlyMsg },
                { status }
            )
        }

        const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || ''

        // Strip any accidental markdown fences Gemini may add
        const cleaned = rawText
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim()

        try {
            const parsed = JSON.parse(cleaned)
            return NextResponse.json(parsed, { status: 200 })
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError, 'Raw Text:', rawText)
            return NextResponse.json(
                { error: "Couldn't clearly read receipt text. Please try a clearer photo or enter details manually." },
                { status: 422 }
            )
        }

    } catch (error) {
        console.error('scan-receipt error:', error)
        return NextResponse.json(
            { error: 'AI scan is temporarily unavailable. Please enter details manually.' },
            { status: 500 }
        )
    }
}
