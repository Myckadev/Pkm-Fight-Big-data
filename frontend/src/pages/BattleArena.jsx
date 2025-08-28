import React, { useEffect, useState } from 'react'
const API = import.meta.env.VITE_API || 'http://localhost:8000'

export default function BattleArena(){
  const [list, setList] = useState([])
  const [a, setA] = useState('1')
  const [b, setB] = useState('4')
  const [res, setRes] = useState(null)

  useEffect(()=>{
    fetch(`${API}/api/pokemon?limit=300`).then(r=>r.json()).then(setList)
  },[])

  const fight = async () => {
    const body = { team_a: [Number(a)], team_b: [Number(b)] }
    const r = await fetch(`${API}/api/battle`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)})
    setRes(await r.json())
  }

  return (
    <div>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <select value={a} onChange={e=>setA(e.target.value)}>
          {list.map(p => <option key={p.pokedex_number} value={p.pokedex_number}>{p.pokedex_number} - {p.name}</option>)}
        </select>
        <span>vs</span>
        <select value={b} onChange={e=>setB(e.target.value)}>
          {list.map(p => <option key={p.pokedex_number} value={p.pokedex_number}>{p.pokedex_number} - {p.name}</option>)}
        </select>
        <button onClick={fight}>Fight!</button>
      </div>

      <div style={{display:'flex', gap:24, marginTop:12, alignItems:'center'}}>
        <img width={160} src={`${API}/static/sprites/official-artwork/${a}.png`} />
        <strong style={{fontSize:24}}>{res ? (res.winner==='A' ? '← Winner' : 'Winner →') : 'VS'}</strong>
        <img width={160} src={`${API}/static/sprites/official-artwork/${b}.png`} />
      </div>

      {res && (
        <div style={{marginTop:12}}>
          <div>Score A: {res.team_a_score?.toFixed?.(2)}</div>
          <div>Score B: {res.team_b_score?.toFixed?.(2)}</div>
          <div>Winner: Team {res.winner}</div>
        </div>
      )}
    </div>
  )
}
