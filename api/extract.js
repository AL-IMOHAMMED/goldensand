export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, type } = req.body;
    
    const prompt = type === 'purchase' 
      ? `انظر إلى هذه الفاتورة واستخرج البيانات التالية بدقة:
         - invoice_no: رقم الفاتورة
         - supplier: اسم المورد/الشركة
         - date: التاريخ (بصيغة YYYY-MM-DD)
         - currency: العملة (USD, EUR, etc)
         - total: المبلغ الإجمالي (رقم فقط)
         - items: مصفوفة الأصناف، كل صنف يحتوي على:
           - code: كود الصنف
           - name: اسم الصنف
           - qty: الكمية (رقم)
           - price: السعر (رقم)
         
         أرجع النتيجة كـ JSON فقط بدون أي نص إضافي.
         مثال: {"invoice_no":"123","supplier":"شركة","date":"2024-01-01","currency":"USD","total":1000,"items":[{"code":"A1","name":"منتج","qty":10,"price":100}]}`
      : `انظر إلى فاتورة الشحن هذه واستخرج:
         - invoice_no: رقم الفاتورة
         - company: شركة الشحن
         - date: التاريخ (YYYY-MM-DD)
         - currency: العملة
         - total: المبلغ (رقم)
         - shipment_ref: رقم الشحنة
         - route: المسار
         - weight: الوزن
         - packages: عدد الطرود
         
         أرجع JSON فقط.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: image } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    console.log('Claude response:', JSON.stringify(data));
    
    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }
    
    const text = data.content?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return res.status(200).json(result);
    } else {
      return res.status(200).json({ error: 'لم يتم استخراج بيانات', raw: text });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
