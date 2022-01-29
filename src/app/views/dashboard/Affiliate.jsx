import React from 'react';
import { useLocation } from 'react-router-dom';
import { styled } from '@mui/system';
import ActivityList from './../list/ActivityList';
import StatCard3 from './shared/StatCard3';
import { H3 } from './../../components/Typography';

const AnalyticsRoot = styled('div')(({ theme }) => ({
    margin: '30px',
    [theme.breakpoints.down('sm')]: {
        margin: '16px',
    },
}))

const FlexBox = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
}))

const Affiliate = () => {
    const { uid } = useLocation().state;

    return (
        <AnalyticsRoot>

            <FlexBox>
                <H3 sx={{ m: 0 }}>Overview</H3>
            </FlexBox>

            <StatCard3 />

            <H3 sx={{ marginTop: 8 }}>Activity</H3>
            <ActivityList />

        </AnalyticsRoot>
    )
}

export default Affiliate;
