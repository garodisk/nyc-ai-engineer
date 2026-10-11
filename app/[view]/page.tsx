import { notFound } from 'next/navigation';
import Platform from '../../components/platform';
import { pages } from '../../lib/navigation';
export function generateStaticParams() { return pages.filter(p=>p!=='Explore').map(p=>({view:p.toLowerCase()})); }
export default async function ViewPage({params}:{params:Promise<{view:string}>}) {
 const {view}=await params;
 const page=pages.find(p=>p.toLowerCase()===view);
 if(!page||page==='Explore') notFound();
 return <Platform initialPage={page}/>;
}
