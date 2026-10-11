import Portal from '@/components/portal';
export default async function ModulePage({params}:{params:Promise<{modulo:string}>}){const {modulo}=await params;return <Portal moduleSlug={modulo}/>}
