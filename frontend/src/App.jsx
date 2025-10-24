import { useEffect, useState } from 'react';
import StoryForm from './components/StoryForm.jsx';
import StoryList from './components/StoryList.jsx';
import { createStory, deleteStory, getStories, updateStory } from './api.js';

const App = () => {
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingStory, setEditingStory] = useState(null);

  const loadStories = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getStories();
      setStories(data);
    } catch (err) {
      setError(err.message || 'Failed to load stories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  const handleCreate = async (story) => {
    try {
      setError('');
      const created = await createStory(story);
      setStories((prev) => [...prev, created].sort((a, b) => a.id - b.id));
      return created;
    } catch (err) {
      setError(err.message || 'Failed to create story');
      throw err;
    }
  };

  const handleUpdate = async (story) => {
    if (!editingStory) return;
    try {
      setError('');
      const updated = await updateStory(editingStory.id, story);
      setStories((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingStory(null);
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to update story');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Delete this story?');
    if (!confirmed) return;

    try {
      setError('');
      await deleteStory(id);
      setStories((prev) => prev.filter((story) => story.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete story');
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Estimate Buddy</h1>
        <p>Keep your backlog organized with quick story point estimates.</p>
      </header>

      {error && <div className="banner error">{error}</div>}

      <StoryForm
        onSubmit={editingStory ? handleUpdate : handleCreate}
        onCancel={() => setEditingStory(null)}
        initialValues={editingStory}
        isEditing={Boolean(editingStory)}
      />

      <section>
        <div className="section-header">
          <h2>Stories</h2>
          <button type="button" className="secondary" onClick={loadStories} disabled={isLoading}>
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {isLoading ? <p>Loading stories…</p> : <StoryList stories={stories} onEdit={setEditingStory} onDelete={handleDelete} />}
      </section>
    </div>
  );
};

export default App;
