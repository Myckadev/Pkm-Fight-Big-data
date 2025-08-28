import React, { useEffect, useState } from 'react'
const API = import.meta.env.VITE_API || 'http://localhost:8000'

export default function TeamBuilder(){
  const [list, setList] = useState([])
  const [team, setTeam] = useState([])
  const [player, setPlayer] = useState('Ash')
  const [name, setName] = useState('My Team')
  const [saved, setSaved] = useState(false)

  useEffect(()=>{
    fetch(`${API}/api/pokemon?limit=300`).then(r=>r.json()).then(setList)
  },[])

  const add = (id) => {
    if(team.length < 6 && !team.includes(id)){
      setTeam([...team, id])
    }
  }
  const removeAt = (idx) => {
    const copy = [...team]; copy.splice(idx,1); setTeam(copy)
  }
  const save = async () => {
    const r = await fetch(`${API}/api/teams/save`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ player, team_name:name, pokemon_ids:team })
    })
    setSaved(r.ok)
  }

  return (
    <div>
      <div style={{display:'flex', gap:8}}>
        <input placeholder='Player' value={player} onChange={e=>setPlayer(e.target.value)} />
        <input placeholder='Team name' value={name} onChange={e=>setName(e.target.value)} />
        <button onClick={save} disabled={team.length===0}>Save team</button>
        {saved && <span>✅ saved</span>}
      </div>

      <div style={{display:'flex', gap:8, marginTop:8}}>
        {Array.from({length:6}).map((_,i)=>(
          <div key={i} style={{width:120, height:120, border:'1px dashed #999', display:'grid', placeItems:'center', position:'relative'}}>
            {team[i] ? (
              <div>
                <img width={110} src={`${API}/static/sprites/official-artwork/${team[i]}.png`} />
                <button style={{position:'absolute', top:0, right:0}} onClick={()=>removeAt(i)}>x</button>
              </div>
            ) : <span>slot {i+1}</span>}
          </div>
        ))}
      </div>

      <h3 style={{marginTop:16}}>Ajouter un Pokémon</h3>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, 160px)', gap:12}}>
        {list.map(p => (
          <button key={p.pokedex_number} onClick={()=>add(p.pokedex_number)} style={{border:'1px solid #ddd', borderRadius:8, padding:8}}>
            <img width={140} src={`${API}/static/sprites/official-artwork/${p.pokedex_number}.png`} />
            <div style={{fontWeight:600}}>{p.name}</div>
            <div>{p.primary_type} • Gen {p.generation}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
