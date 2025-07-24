const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/openai/suggest
// Expects: { promptType: 'title' | 'about', formData: { ... } }
router.post('/suggest', async (req, res) => {
  const { promptType, formData } = req.body;
  if (!promptType || !formData) {
    return res.status(400).json({ error: 'promptType and formData are required' });
  }

  let prompt;
  if (promptType === 'title') {
    prompt = `Given the following listing details, suggest a catchy and descriptive title for a rental listing.\nDetails: ${JSON.stringify(formData)}\nTitle:`;
  } else if (promptType === 'about') {
    prompt = `Given the following listing details, write a friendly and informative \"About this place\" section for a rental listing. Your response MUST be no more than 500 characters.\nDetails: ${JSON.stringify(formData)}\nAbout this place:`;
  } else {
    return res.status(400).json({ error: 'Invalid promptType' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for writing rental listings.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: promptType === 'title' ? 20 : 200,
      temperature: 0.7,
    });
    const aiText = completion.choices[0].message.content.trim();
    res.json({ suggestion: aiText });
  } catch (error) {
    console.error('OpenAI error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate suggestion' });
  }
});

module.exports = router; 