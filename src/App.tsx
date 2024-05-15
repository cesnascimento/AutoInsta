import React from 'react';
import FriendList from './components/FriendList';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import SideMenu from './base/SideMenu';

const App: React.FC = () => {
  return (
    <div className="App">
    <SideMenu />
    <Grid container justifyContent="center" alignItems="center" style={{ height: '100vh' }}>
      <Grid item>
        <Paper elevation={3} style={{ padding: 24, margin: 24 }}>
          <Typography variant="h4" color="primary" gutterBottom>Ferramenta Instagram Close Friends</Typography>
          <FriendList />
        </Paper>
      </Grid>
    </Grid>
  </div>
  );
};

export default App;
