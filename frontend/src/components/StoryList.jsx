const StoryList = ({ stories, onEdit, onDelete }) => {
  if (!stories.length) {
    return <p className="empty">No stories yet. Add one to get started.</p>;
  }

  return (
    <ul className="story-list">
      {stories.map((story) => (
        <li key={story.id} className="card">
          <div className="story-header">
            <h3>{story.title}</h3>
            <span className="badge">{story.size} pts</span>
          </div>
          {story.description && <p className="story-description">{story.description}</p>}
          <div className="actions">
            <button type="button" onClick={() => onEdit(story)}>
              Edit
            </button>
            <button type="button" className="danger" onClick={() => onDelete(story.id)}>
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default StoryList;
