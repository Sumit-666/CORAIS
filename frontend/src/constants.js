export const TRIAL_ORDER = [
  { tier: 3, provider: 'google',    name: 'Gemini Flash Lite' },
  { tier: 3, provider: 'openai',    name: 'GPT-4.1 Nano'      },
  { tier: 3, provider: 'anthropic', name: 'Haiku 3.5'         },
  { tier: 2, provider: 'google',    name: 'Gemini 2.5 Flash'  },
  { tier: 2, provider: 'openai',    name: 'GPT-5 Mini'        },
  { tier: 2, provider: 'anthropic', name: 'Sonnet 4'          },
  { tier: 1, provider: 'google',    name: 'Gemini 2.5 Pro'    },
  { tier: 1, provider: 'openai',    name: 'GPT-5'             },
  { tier: 1, provider: 'anthropic', name: 'Opus 4'            },
]

export const STEPS = [
  { key: 'jd_parsing',           label: 'JD Parser',          icon: '📋' },
  { key: 'candidate_evaluation', label: 'Candidate Evaluator', icon: '🎯' },
  { key: 'career_advice',        label: 'Career Advisor',      icon: '💡' },
  { key: 'cover_letter',         label: 'Cover Letter',        icon: '✉️' },
]

export const INIT_STEP = { status: 'idle', grid: {}, result: null, currentModel: null }
