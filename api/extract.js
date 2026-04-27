export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { file, fileType, type } = req.body;
    
    const prompt = type === 'purchase' 
      ? `استخرج من هذه الفاتورة: invoice_no (رقم الفاتورة), supplier (المورد), date (التاريخ YYYY-MM-DD), currency (العملة), total (المجموع كرقم), items (مصفوفة تحتوي code, name, qty, price). أرجع JSON فقط.`
      : `استخرج من فاتورة الشحن: invoice_no, company, date, currency, total, shipment_ref, route, weight, packages. أرجع JSON فقط.`;
    const content = [];
    
    if (fileType === 'application/pdf') {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: file }
      });
    } else {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: fileType || 'image/png', data: file }
      });
    }
    
    content.push({ type: 'text', text: prompt });
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{ role: 'user', content }]
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
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
