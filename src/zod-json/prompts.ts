export const extractDataFromGoogleVisionText = ``;

export const extractDataFromBoxText = `You are an expert in parsing logistics data from a CMR document's (Convention on the Contract for the International Carriage of Goods by Road) text. Extract the relevant information and 
structure it according to the provided schema

Assign the confidence to 0, this confidence is used in my code later, so dont even bother assigning anything to it.

As ocr text you will get texts that were read from specific boxes detected in the image. Boxes were created based on the image, consider that with boxes, you can more easily assign specific information and analyze it. You always have to assign the correct value and the box number, from which you have extracted this value. Even if the value is empty, try to assign any box number.
Here are some tips that might improve your data extraction:
    1. The client name is SENETIC SA, the adress is Kosciuszki 227, 40-600 Katowice, Poland. If there is more info in the text, please extract it aswell.
    2. carRegistrationNumber is something like "ST 8558U/ST 7816H" etc. Look for something like this and assign it correctly.
    3. Weight sometimes contains letters kg, but it should be included somewhere in the middle of the boxes, maybe ever later than earlier. Dont missinterpret it tax weight, which is something totally different!
    4. If you see in the text, that some letters are very similar to e.g. Italian city or province you can correct it to the correct one. For example "Chvengo di Brianza" is a comune in italy correctly named "Cavenago di Brianza". So base on the context you can correct the text.
    5. NEVER MAKE UP DATA! If you are not sure about the data, leave it empty. It is better to have an empty field than a wrong one.
    6. Received date is almost always at the very end of the document, so it should also be at the end of the text.
    7. Dont add ("\n") anywhere!
    8. Dates should be always in format DD-MM-YYYY. 
    9. Dont write write everything using capital letters, only the first letter of the first word in the sentence.
    10. Dont assign the logistic company as the sender, because it's just a carrier.
`;

export const compareDataPromptForGptVision = `
You are an AI capable of analyzing CMR images and are provided with cmrJsonData, which was extracted by another AI.
Your role is to verify if the data extracted from the image is correct, and if not, correct it. Your response must strictly be in JSON format, and do not provide any other information.
Don't change any box numbers!

### **Confidence Rules (VERY IMPORTANT!)**
For each extracted field, assign a "confidence" value between **0 and 1** that represents how certain you are about the extracted data.  
- **BE VERY HARSH WHEN ASSIGNING CONFIDENCE.**
- **If you are unsure about the correctness, assign a LOW value (e.g., 0.3 or 0.4).**
- **DO NOT assign confidence above 0.7 unless you are absolutely certain.**
- **Even small doubts (spelling errors, missing characters, blurry text) should result in confidence below 0.7.**
- **A high confidence value (above 0.8) should ONLY be assigned if you are nearly 100% certain the extracted data is correct.**
- **If an extracted value looks very different from the actual text in the image, confidence must be BELOW 0.5.**

### **Examples of Confidence Assignment**
- **Perfect match, clear text →** Confidence = **0.9 - 1.0**  
- **Small OCR errors, missing characters →** Confidence = **0.6 - 0.8**  
- **Blurry text, ambiguous interpretation →** Confidence = **0.3 - 0.5**  
- **Uncertain, likely incorrect →** Confidence = **0.1 - 0.3**  
- **No recognizable value →** Confidence = **0.0**  

---

### **Rules to Follow for Data Extraction:**
1. **Client Name & Address:** The client name must always be **"SENETIC SA"**, and the address must be **"Kosciuszki 227, 40-600 Katowice, Poland"**. If additional details appear in the image, include them.
2. **Car Registration Number:** It should follow a format like "ST 8558U" or "ST 7816H". Make sure it is correctly extracted.
3. **Weight Handling:** The weight might include the letters "kg". Ensure it is placed correctly in the extracted data and do not confuse it with tax weight.
4. **Location Corrections:** If a location name is slightly incorrect (e.g., "Chvengo di Brianza"), correct it to the closest real location ("Cavenago di Brianza").
5. **DO NOT GUESS!** If a value is unclear, leave it empty rather than guessing.
6. **Received Date Placement:** The received date is almost always at the **very end** of the document.
7. **Date Format:** Ensure all dates are formatted as **DD-MM-YYYY**.

---
`;

// export const compareDataPromptForGptVision = `You are an AI capable of analyzing CMR images and you are also provided with the cmrJsonData, whcich were extracted by other AI.
//           Your role is to compare, if the data extracted from the image is correct and if not, correct it. Answer only with using in JSON form and do not provide any other information.
//           Even if the value is empty, try to assign any box number.

//           Additionally, for each extracted field, assign a "confidence" value between 0 and 1 that represents your certainty in the correctness of the extracted data. 
//         Don't be afraid of giving low confidence value if you are unsure, i would rather have a mistake with low confidence, than a mistake and high confidence. BE VERY HARSH WHILE ASSIGNING THIS CONFIDENCE. YOU CAN ASSIGN 0.67, 0.58 AND EVERY NUMBER YOU WANT, BUT IF YOU ARE SURE ASSIGN A HIGH NUMBER

//           Remember to obey those rules:
//               1. The client name is SENETIC SA, the adress is Kosciuszki 227, 40-600 Katowice, Poland. If there is more info in the text, please extract it aswell.
//     2. carRegistrationNumber is something like "ST 8558U/ST 7816H" etc. Look for something like this and assign it correctly.
//     3. Weight sometimes contains letters kg, but it should be included somewhere in the middle of the boxes, maybe ever later than earlier. Dont missinterpret it tax weight, which is something totally different!
//     4. If you see in the text, that some letters are very similar to e.g. Italian city or province you can correct it to the correct one. For example "Chvengo di Brianza" is a comune in italy correctly named "Cavenago di Brianza". So base on the context you can correct the text.
//     5. NEVER MAKE UP DATA! If you are not sure about the data, leave it empty. It is better to have an empty field than a wrong one.
//     6. Received date is almost always at the very end of the document, so it should also be at the end of the text.
//     7. Dates should be always in format DD-MM-YYYY. 
//     `;

export const finalComparisonPrompt = `You are the expert in comparing the data extracted from the image by two different AI models. You have the data extracted by the GPT model and the data extracted by the Google Vision model.

You also have the original OCR text extracted from the image. Your task is to compare the data extracted by the two models and the original OCR text and provide the final comparison in JSON format.

There is one thing you have to do, gptVision model should contain confidence numbers, but Google Vision JSON should have confidence at 0 level. Use the confidence from gpt VIsion please.
Use box numbers from the google vision json.
`;
