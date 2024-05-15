import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import debounce from "lodash/debounce";
import User from '../instagram/User';
import UserItem from './UserItem';
import LoadingOverlay from './LoadingOverlay';
import { getFriendsLists, setCloseFriends } from '../instagram/api';
import { Typography, TextField, Button } from "@material-ui/core";

const useStyles = makeStyles(theme => ({
    selectAllButton: {
        float: 'right',
    },
    userList: {
        margin: '20px 0 40px 0',
        maxHeight: "400px",
        overflow: "scroll"
    }
}));

const FriendList = () => {
    const classes = useStyles();
    const [userList, setUserList] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

    useEffect(() => {
        fetchFriends('')
    }, []);

    const handleCreateList = (event) => {
        event.preventDefault();
        setLoading(true);
        setCloseFriends(selectedUsers)
            .catch(error => console.error(error)).finally(() => setLoading(false))
    };

    const toggleSelectAll = () => {
        if (selectedUsers.length === userList.length) {
            setSelectedUsers([]);
            window.dispatchEvent(new Event('noSelected'));
        } else {
            const allUsers = userList.map(user => user.pk);
            setSelectedUsers(allUsers);
            window.dispatchEvent(new Event('allSelected'));
        }
    };

    const handleUserToggle = (user) => {
        const currentIndex = selectedUsers.indexOf(user.pk);
        const newSelectedUsers = [...selectedUsers];

        if (currentIndex === -1) {
            newSelectedUsers.push(user.pk);
        } else {
            newSelectedUsers.splice(currentIndex, 1);
        }

        setSelectedUsers(newSelectedUsers);
    };

    const fetchFriends = (searchTerm) => {
        setLoading(true);
        getFriendsLists(searchTerm)
            .then(userList => {
                setUserList(userList);
                setLoading(false);
            })
            .catch(error => console.error(error));
    }

    const searchFriends = (event) => {
        const { value } = event.target;
        setSearchTerm(value);
        debounce(() => fetchFriends(value), 1000)();
    };

    return (
        <div>
            {loading && <LoadingOverlay />}
            <Typography variant="h5" gutterBottom>Lista</Typography>
            <Typography variant="subtitle1" gutterBottom>Total: {userList.length}</Typography>
            <TextField
                required
                fullWidth
                label="Search by username"
                margin="normal"
                variant="outlined"
                onChange={searchFriends}
            />
            <div className={classes.userList}>
                {userList.map((user) => (
                    <UserItem key={user.pk} user={user} onUserSelect={() => handleUserToggle(user)} />
                ))}
            </div>
            <Button type="submit" variant="contained" color="primary" onClick={handleCreateList}>
                Criar Lista
            </Button>
            <Button variant="outlined" color="primary" className={classes.selectAllButton} onClick={toggleSelectAll}>
                Selecionar Todos
            </Button>
        </div>
    );
};

export default FriendList;
