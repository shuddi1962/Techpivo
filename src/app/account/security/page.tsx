const [showDeleteDialog, setShowDeleteDialog] = useState(false);
const [deleteInput, setDeleteInput] = useState('');
const [message, setMessage] = useState('');

const handleDeleteClick = () => {
  setShowDeleteDialog(true);
  setDeleteInput('');
  setMessage('');
};

const handleDeleteSubmit = async () => {
  if (deleteInput !== 'DELETE') {
    setMessage('Please type exactly "DELETE" to confirm.');
    return;
  }

  try {
    const response = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    };

    const result = await response.json();
    if (result.success) {
      setMessage('Account deleted successfully.');
      setShowDeleteDialog(false);
      setDeleteInput('');
    } else {
      setMessage(result.error || 'Failed to delete account');
      setShowDeleteDialog(false);
    }
  } catch (error) {
    setMessage(`Error: ${error.message}`);
    setShowDeleteDialog(false);
  }