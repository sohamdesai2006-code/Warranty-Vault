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
            return NextResponse.json(
                { error: apiError.message || 'Failed to parse receipt image via AI.' },
                { status }
            )
        }

        const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || ''

        // Strip any accidental markdown fences Gemini may add
        const cleaned = rawText
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim()

        const parsed = JSON.parse(cleaned)

        return NextResponse.json(parsed, { status: 200 })

    } catch (error) {
        console.error('scan-receipt error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to process receipt.' },
            { status: 500 }
        )
    }
}
