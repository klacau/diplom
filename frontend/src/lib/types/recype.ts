export type Ingredient = {
  name: string;
  amount: string;
  image_url?: string | null;
};

export type Step = {
  step: number;
  text: string;
};

export type Recipe = {
  id: number;
  owner_id?: number;
  title: string;
  description?: string | null;
  image_url?: string | null;
  ingredients: Ingredient[];
  steps: Step[];
  created_at?: string;
};
