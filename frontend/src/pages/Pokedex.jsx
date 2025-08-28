import React, { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API || 'http://localhost:8000'

export default function Pokedex(){
  const [list, setList] = useState([])
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [generation, setGeneration] = useState('')

  const load = async () => {
    const params = new URLSearchParams()
    if(q) params.set('q', q)
    if(type) params.set('type', type)
    if(generation) params.set('generation', generation)
    const r = await fetch(`${API}/api/pokemon?`+params.toString())
    const data = await r.json()
    setList(data)
  }

  useEffect(()=>{ load() }, [])

  return (
    <div>
      <div style={{display:'flex', gap:8, marginBottom:8}}>
        <input placeholder='Recherche...' value={q} onChange={e=>setQ(e.target.value)} />
        <input placeholder='Type (ex: Fire)' value={type} onChange={e=>setType(e.target.value)} />
        <input placeholder='Génération (ex: 1)' value={generation} onChange={e=>setGeneration(e.target.value)} />
        <button onClick={load}>Filtrer</button>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, 180px)', gap:12}}>
        {list.map(p => (
          <div key={p.pokedex_number} style={{border:'1px solid #ddd', borderRadius:8, padding:8}}>
            <img alt={p.name} src={`${API}/static/sprites/official-artwork/${p.pokedex_number}.png`} onError={(e)=>{e.currentTarget.src=p.sprite_official_artwork_url}} width={160} />
            <div style={{fontWeight:600}}>{p.pokedex_number} - {p.name}</div>
            <div>{p.primary_type} • Gen {p.generation} • {p.total_stats}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
