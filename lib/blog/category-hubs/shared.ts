export interface CategoryHubQuestion {
  question: string;
  answer: string;
  slug: string;
}

export interface CategoryHubSection {
  title: string;
  description: string;
  slugs: string[];
}

export interface CategoryHubConfig {
  heroTitle: string;
  heroDescription: string;
  audience: string[];
  questions: CategoryHubQuestion[];
  sections: CategoryHubSection[];
}

export function question(questionText: string, slug: string, answer: string): CategoryHubQuestion {
  return { question: questionText, slug, answer };
}

export function section(title: string, description: string, slugs: string[]): CategoryHubSection {
  return { title, description, slugs };
}

export function defineCategoryHub(config: CategoryHubConfig): CategoryHubConfig {
  return config;
}
