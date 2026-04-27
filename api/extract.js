export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { file, fileType, type } = req.body;
    
    const prompt = type === 'purchase' 
      ? `Extract from this invoice and return ONLY valid JSON: {"invoice_no":"", "supplier":"", "date":"YYYY-MM-DD", "currency":"", "total":0, "items":[{"code":"", "name":"", "qty":0, "price":0}]}`
      : `Extract from this shipping invoice and return ONLY valid JSON: {"invoice_no":"", "company":"", "date":"YYYY-MM-DD", "currency":"", "total":0, "shipment_ref":"", "route":"", "weight":"", "packages":""}`;
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: file
              }
            },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }
    
    const text = data.content?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
