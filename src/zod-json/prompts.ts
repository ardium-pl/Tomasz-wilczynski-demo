export const extractDataFromGoogleVisionText = ``;

export const extractDataFromBoxText = `You are an expert in parsing logistics data from a CMR document's (Convention on the Contract for the International Carriage of Goods by Road) text. Extract the relevant information and 
structure it according to the provided schema
As ocr text you will get texts that were read from specific boxes detected in the image. Boxes were created based on the image, consider that with boxes, you can more easily assign specific information and analyze it. 
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
`;

export const compareDataPrompt = `You are an AI capable of analyzing CMR images and you are also provided with the cmrJsonData, whcich were extracted by other AI.
          Your role is to compare, if the data extracted from the image is correct and if not, correct it. Answer only with using in JSON form and do not provide any other information.

          Remember to obey those rules:
              1. The client name is SENETIC SA, the adress is Kosciuszki 227, 40-600 Katowice, Poland. If there is more info in the text, please extract it aswell.
    2. carRegistrationNumber is something like "ST 8558U/ST 7816H" etc. Look for something like this and assign it correctly.
    3. Weight sometimes contains letters kg, but it should be included somewhere in the middle of the boxes, maybe ever later than earlier. Dont missinterpret it tax weight, which is something totally different!
    4. If you see in the text, that some letters are very similar to e.g. Italian city or province you can correct it to the correct one. For example "Chvengo di Brianza" is a comune in italy correctly named "Cavenago di Brianza". So base on the context you can correct the text.
    5. NEVER MAKE UP DATA! If you are not sure about the data, leave it empty. It is better to have an empty field than a wrong one.
    6. Received date is almost always at the very end of the document, so it should also be at the end of the text.
    7. Dates should be always in format DD-MM-YYYY. 
    `;

export const compareDataPromptForGoogleVision = `You are the expert in comparing cmrJsonData to the provided ocr text. cmrJsonData was previously created by the other AI model, and it is your job to check if it did it correctly. 
If you find any errors or omissions, correct them.
`;
