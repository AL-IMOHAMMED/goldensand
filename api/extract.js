export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { file, fileType, type } = req.body;
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    const prompt = type === 'purchase' 
      ? `Look at this invoice and extract: invoice_no, supplier, date (YYYY-MM-DD format), currency, total (number only), items (array with code, name, qty, price). Return ONLY valid JSON, no other text.`
      : `Look at this shipping invoice and extract: invoice_no, company, date (YYYY-MM-DD), currency, total, shipment_ref, route, weight, packages. Return ONLY valid JSON, no other text.`;
    
    // فرّق بين PDF والصور — كل نوع له content type مختلف
    const mt = (fileType || 'image/png').toLowerCase();
    const isPdf = mt === 'application/pdf';
    const allowedImages = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    let fileBlock;
    if (isPdf) {
      fileBlock = {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: file }
      };
    } else if (allowedImages.includes(mt)) {
      fileBlock = {
        type: 'image',
        source: { type: 'base64', media_type: mt, data: file }
      };
    } else {
      return res.status(400).json({ 
        error: `Unsupported file type: ${mt}. Use PDF, JPEG, PNG, GIF, or WEBP.` 
      });
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            fileBlock,
            { type: 'text', text: prompt }
          ]
        }]
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('Anthropic API Error:', data.error);
      return res.status(400).json({ error: data.error.message, details: data.error });
    }
    
    const text = data.content?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: error.message });
  }
}
