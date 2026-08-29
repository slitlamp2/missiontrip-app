import productsData from '../data/products.json';
import guidesData from '../data/guides.json';
import type { Guide, Product, UserProfile } from '../types';

const products = productsData as Product[];
const guides = guidesData as Guide[];

/** 프로필의 관심사·연령대에 해당하는 제품만 필터링한다. */
export function getRecommendedProducts(profile: UserProfile): Product[] {
  return products.filter(
    (product) =>
      profile.concerns.includes(product.concern) &&
      product.ageGroups.includes(profile.ageGroup),
  );
}

export function getGuides(profile: UserProfile): Guide[] {
  return guides.filter(
    (guide) =>
      profile.concerns.includes(guide.concern) &&
      guide.ageGroups.includes(profile.ageGroup),
  );
}
