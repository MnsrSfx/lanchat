import { z } from 'zod';
import { publicProcedure } from '../../create-context';

const translateProcedure = publicProcedure
  .input(
    z.object({
      text: z.string(),
      targetLang: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const { text, targetLang } = input;

    console.log('Translating text:', text, 'to language:', targetLang);

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
      
      console.log('Translation URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Translation API error:', errorText);
        throw new Error(`Translation API returned status ${response.status}`);
      }

      const data = await response.json();
      console.log('Translation response data:', JSON.stringify(data).substring(0, 200));
      
      if (!data || !Array.isArray(data) || !data[0] || !Array.isArray(data[0])) {
        console.error('Invalid translation response structure:', data);
        throw new Error('Invalid translation response format');
      }

      const translatedText = data[0]
        .filter((item: any) => item && item[0])
        .map((item: any) => item[0])
        .join('');

      if (!translatedText) {
        throw new Error('Translation produced empty result');
      }

      console.log('Translation successful:', translatedText);

      return {
        translatedText,
        originalText: text,
        targetLang,
      };
    } catch (error) {
      console.error('Translation error details:', error);
      if (error instanceof Error) {
        throw new Error(`Translation failed: ${error.message}`);
      }
      throw new Error('Failed to translate text. Please try again.');
    }
  });

export default translateProcedure;
