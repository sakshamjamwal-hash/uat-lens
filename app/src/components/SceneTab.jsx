import SectionHeader from './SectionHeader.jsx'
import SceneCard from './SceneCard.jsx'
import FindingsTable from './FindingsTable.jsx'
import Reveal from './Reveal.jsx'

export default function SceneTab({ tab, editState, deletedRows, addedRows, onEdit, onDelete, onAddRow, onLightbox, isAdmin }) {
  return (
    <div>
      <SectionHeader idx={tab.sectionHeader.idx} title={tab.sectionHeader.title} />

      {tab.scenes.map(scene => (
        <SceneCard
          key={scene.id}
          scene={scene}
          tabId={tab.id}
          editState={editState}
          deletedRows={deletedRows}
          addedRows={addedRows}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddRow={onAddRow}
          onLightbox={onLightbox}
          isAdmin={isAdmin}
        />
      ))}

      {tab.blocks.map((block, i) => (
        <Reveal
          key={block.id}
          className="block"
          y={20}
          delay={0.08 + i * 0.05}
        >
          <div className="bh">
            <h3>{block.header}</h3>
            <span className="cnt">{block.count}</span>
          </div>
          <FindingsTable
            block={block}
            tableKey={`${tab.id}:${block.id}`}
            editState={editState}
            deletedRows={deletedRows}
            addedRows={addedRows}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddRow={onAddRow}
            isAdmin={isAdmin}
          />
        </Reveal>
      ))}
    </div>
  )
}
