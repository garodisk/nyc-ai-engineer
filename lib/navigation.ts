export const pages = ['Explore','Builders','Teams','Hackathons','Projects','Challenges'] as const;
export type Page = (typeof pages)[number];
export function pageHref(page: Page) { return page === 'Explore' ? '/' : `/${page.toLowerCase()}/`; }
export function pageFromPath(path: string): Page {
 return pages.find(page => pageHref(page) === `${path.replace(/\/$/, '')}/`) ?? 'Explore';
}
