import React, { useState } from 'react'
import Pokedex from './pages/Pokedex'
import BattleArena from './pages/BattleArena'
import TeamBuilder from './pages/TeamBuilder'

export default function App() {
  const [tab, setTab] = useState('pokedex')

  return (
    <div style={{fontFamily:'system-ui', padding:16}}>
      <h1>Pokémon Lakehouse Arena</h1>
      <nav style={{display:'flex', gap:8, marginBottom:12}}>
        <button onClick={()=>setTab('pokedex')}>Pokédex</button>
        <button onClick={()=>setTab('battle')}>Battle Arena</button>
        <button onClick={()=>setTab('team')}>Team Builder</button>
      </nav>
      {tab==='pokedex' && <Pokedex />}
      {tab==='battle' && <BattleArena />}
      {tab==='team' && <TeamBuilder />}
    </div>
  )
}
