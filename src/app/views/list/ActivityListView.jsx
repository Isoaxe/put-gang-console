import {
    Card,
    Avatar,
    Grid,
} from '@mui/material'
import React, { useState } from 'react'
import { Box, styled, useTheme } from '@mui/system'
import ReceiptsModal from './../modal/ReceiptsModal';
import { Small, Span, Paragraph } from 'app/components/Typography'
import { themeShadows } from 'app/components/MatxTheme/themeColors'
import {
  AddTask,
  HighlightOff,
  MailOutline,
  MonetizationOn
} from '@mui/icons-material';

const FlexBox = styled(Box)(() => ({
    display: 'flex',
    alignItems: 'center',
}))

const ListCard = styled(Card)(({ theme }) => ({
    padding: '8px',
    position: 'relative',
    transition: 'all 0.3s ease',
    boxShadow: themeShadows[12],
    '& .card__button-group': {
        display: 'none',
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        zIndex: 1,
        background: theme.palette.background.paper,
    },
    '&:hover': {
        cursor: 'pointer',
        '& .card__button-group': {
            display: 'flex',
            alignItems: 'center',
        },
    },
}))

function actionImage (action, product) {
  if (action === "join" && product === "news") return <MailOutline color="info" />;
  if (action === "cancel" && product === "news") return <MailOutline color="disabled" />;
  if (action === "join") return <AddTask color="success" />;
  if (action === "cancel") return <HighlightOff color="error" />;
  if (action === "recur") return <MonetizationOn color="success" />;
}

const ActivityListView = ({ list = [] }) => {
    const [visible, setVisible] = useState(false);
    const { palette } = useTheme();
    const textMuted = palette.text.secondary;

    function displayReceipts (userId) {
      console.log(userId);
      setVisible(true);
    }

    return (
        <div>
            {list.map((item, index) => (
                <ListCard
                    key={item.id}
                    elevation={3}
                    sx={{ mb: index < list.length && 2 }}
                    onClick={() => displayReceipts(item.uid)}
                >
                    <Grid container justify="space-between" alignItems="center">
                        <Grid item md={10}>
                            <FlexBox>
                                {actionImage(item.action, item.product)}
                                <Box ml={2}>
                                    <Paragraph sx={{ mb: 1 }}>
                                        {item.statement}
                                    </Paragraph>
                                    <Box display="flex">
                                        <Small sx={{ color: textMuted }}>
                                            {new Date(item.date).toLocaleString()}
                                        </Small>
                                        <Small sx={{ ml: 3, color: textMuted }}>
                                            {item.email}
                                        </Small>
                                    </Box>
                                </Box>
                            </FlexBox>
                        </Grid>
                        <Grid item md={2}>
                            <FlexBox>
                                <Avatar src={item.userImage}></Avatar>
                                <Span sx={{ ml: '16px' }}>{item.userName}</Span>
                            </FlexBox>
                        </Grid>
                    </Grid>
                </ListCard>
            ))}
            <ReceiptsModal
								visible={visible}
								setVisible={setVisible}
							/>
        </div>
    )
}

export default ActivityListView