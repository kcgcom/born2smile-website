export interface CategoryHubQuestion {
  question: string;
  slug: string;
}

export interface CategoryHubSection {
  title: string;
  description: string;
  slugs: string[];
}

export interface CategoryHubFaqItem {
  q: string;
  a: string;
}

export interface CategoryHubConfig {
  heroTitle: string;
  heroDescription: string;
  intro: string;
  audience: string[];
  questions: CategoryHubQuestion[];
  featuredSlugs: string[];
  sections: CategoryHubSection[];
  faq: CategoryHubFaqItem[];
}

export function question(questionText: string, slug: string): CategoryHubQuestion {
  return { question: questionText, slug };
}

export function section(title: string, description: string, slugs: string[]): CategoryHubSection {
  return { title, description, slugs };
}

export function defineCategoryHub(config: CategoryHubConfig): CategoryHubConfig {
  return config;
}
