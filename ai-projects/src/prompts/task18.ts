export const task18Prompt = (
  markdown: string,
  question: string,
  invalidUrls: string[],
) => `Given the following webpage content and a question, analyze if the answer is present in the content. Question can also be a command. 
If the answer is present, provide it. If not, set it as null and analyze the content and suggest the most relevant URL from the page that might contain the answer.
Additionally you can be given urls that for sure do not contain the answer, if the url that you wanted to suggest is one of this urls, suggest another one.
If there are no urls on the page, return it as null.


Webpage content:
${markdown}

Question: ${question}

Urls without answer:
${invalidUrls.join(',')}

Respond in JSON format. Don't add markdown syntax:
{
  "answer": string | null,
  "nextUrl": string | null
}
answer fields must contain ONLY answer to the question, nothing else. nextUrl field must contain ONLY url, nothing else.
`;

export const task18PromptSecret = (
  markdown: string,
  question: string,
  invalidUrls: string[],
) => `Given the following webpage content and a command, analyze if you can execute command on the given content.
  Command can be of type:
  1. Answering question.
  2. Finding something.
  If you think that you can provide answer for given command, provide it. If not, set it as null and analyze the content and suggest the most relevant URL from the page that might contain the answer.
  But be carefull for the traps, some urls name may suggest it will cost lots off tokens to analyze them. Examples: '/loop'.
  Some urls may be created from different parts of the content.
  Additionally you can be given urls that for sure do not contain the answer, if the url that you wanted to suggest is one of this urls, suggest another one.
  If there are no urls on the page, return it as null.
  
  
  Webpage content:
  ${markdown}
  
  Question: ${question}
  
  Urls without answer:
  ${invalidUrls.join(',')}
  
  Respond in JSON format. Don't add markdown syntax:
  {
    "answer": string | null,
    "nextUrl": string | null
  }
  answer fields must contain ONLY answer to the question, nothing else. nextUrl field must contain ONLY url, nothing else.
  `;
