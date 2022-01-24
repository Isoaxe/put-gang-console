import UserListView from './UserListView'
import { debounce } from 'lodash'
import ListSearchbar from './ListSearchbar'
import { Hidden } from '@mui/material'
import DataContext from './../../contexts/DataContext';
import React, { useState, useContext, useEffect, useMemo, useCallback } from 'react'
import { Box, styled } from '@mui/system'

const Container = styled('div')(({ theme }) => ({
    margin: '30px',
    [theme.breakpoints.down('sm')]: {
        margin: '16px',
    },
}))

const UserList = () => {
    const [originalList, setOriginalList] = useState([])
    const [list, setList] = useState([])
    const { role, users } = useContext(DataContext);

    const formatUserData = useCallback(
      () => {
        users.forEach(item => item["data"] = `
          ${item.name}
          ${item.email}
          ${item.membLvl}
          ${item.role}
          ${item.joinDate}
          ${item.expiryDate}
        `);
        setOriginalList(users);
        setList(users);
      }, [users]
    );

    const handleInputChange = (event) => {
        let { value } = event.target
        search(value)
    }

    const search = useMemo(
        () =>
            debounce((query) => {
                let tempList = originalList.filter((item) =>
                    item.data.toLowerCase().match(query.toLowerCase())
                )
                setList([...tempList])
            }, 200),
        [originalList]
    )

    useEffect(() => {
        if (Object.keys(users).length && ["admin", "level-1", "level-2"].includes(role)) {
            formatUserData();
        }
    }, [users, role, formatUserData])

    return (
        <Container className="list">
            <Box mb={2}>
                <ListSearchbar handleInputChange={handleInputChange}>
                </ListSearchbar>
            </Box>
            <Hidden xsDown>
                <UserListView list={list}></UserListView>
            </Hidden>
        </Container>
    )
}

export default UserList
