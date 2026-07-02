import SectionHeader from './SectionHeader.jsx'
import FindingsTable from './FindingsTable.jsx'
import Reveal from './Reveal.jsx'

export default function Overview({ tab, editState, deletedRows, addedRows, onEdit, onDelete, onAddRow, isAdmin }) {
  return (
    <div>
      {/* Systematic gaps */}
      <SectionHeader idx={tab.sectionHeader.idx} title={tab.sectionHeader.title} />
      <Reveal className="block" y={20} delay={0.06}>
        <div className="bh">
          <h3>{tab.blocks[0].header}</h3>
          <span className="cnt">{tab.blocks[0].count}</span>
        </div>
        <FindingsTable
          block={tab.blocks[0]}
          tableKey={`overview:systematic`}
          editState={editState}
          deletedRows={deletedRows}
          addedRows={addedRows}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddRow={onAddRow}
          isAdmin={isAdmin}
        />
      </Reveal>

      {/* Critical gaps */}
      <SectionHeader idx={tab.blocks[1].sectionHeader.idx} title={tab.blocks[1].sectionHeader.title} />
      <Reveal className="block" y={20} delay={0.12}>
        <div className="bh">
          <h3>{tab.blocks[1].header}</h3>
          <span className="cnt">{tab.blocks[1].count}</span>
        </div>
        <FindingsTable
          block={tab.blocks[1]}
          tableKey={`overview:critical`}
          editState={editState}
          deletedRows={deletedRows}
          addedRows={addedRows}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddRow={onAddRow}
          isAdmin={isAdmin}
        />
      </Reveal>

      {/* Root cause analysis */}
      <Reveal className="block" y={20} delay={0.18} style={{ marginTop: '48px' }}>
        <div className="bh">
          <h3>Why these were missed — root cause breakdown</h3>
          <span className="cnt">6 categories</span>
        </div>
        <div className="callout-grid" style={{ padding: '24px 28px' }}>
          {tab.rootCause.map((item, i) => (
            <div key={i} className="callout-item">
              <div className="ci-tag">{item.tag}</div>
              <div className="ci-title">{item.title}</div>
              <div className="ci-body">{item.body}</div>
              <div className="ci-bugs">{item.bugs}</div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Missing sections note */}
      <div
        className="missing"
        style={{ margin: '0 48px 48px', borderRadius: 'var(--r-2xl)' }}
        dangerouslySetInnerHTML={{ __html: tab.missingNote }}
      />
    </div>
  )
}
