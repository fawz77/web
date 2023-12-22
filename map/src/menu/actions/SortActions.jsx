import {
    Box,
    Divider,
    FormControl,
    FormControlLabel,
    Icon,
    ListItem,
    ListItemText,
    Paper,
    Radio,
    RadioGroup,
} from '@mui/material';
import { getGpxTime } from '../../manager/track/TracksManager';
import React, { forwardRef, useContext, useEffect, useState } from 'react';
import { ReactComponent as AscendingIcon } from '../../assets/icons/ic_action_sort_by_name_ascending.svg';
import { ReactComponent as TimeIcon } from '../../assets/icons/ic_action_time.svg';
import { ReactComponent as DescendingIcon } from '../../assets/icons/ic_action_sort_by_name_descending.svg';
import { ReactComponent as LongToShortIcon } from '../../assets/icons/ic_action_sort_long_to_short.svg';
import { ReactComponent as ShortToLongIcon } from '../../assets/icons/ic_action_sort_short_to_long.svg';
import { ReactComponent as NewDateIcon } from '../../assets/icons/ic_action_sort_date_1.svg';
import { ReactComponent as OldDateIcon } from '../../assets/icons/ic_action_sort_date_31.svg';
import { ReactComponent as NearestIcon } from '../../assets/icons/ic_show_on_map_outlined.svg';
import styles from '../trackfavmenu.module.css';
import AppContext from '../../context/AppContext';
import { DEFAULT_FAV_GROUP_NAME } from '../../manager/FavoritesManager';

const az = (a, b) => (a > b) - (a < b);

function byAlpha(files, reverse) {
    return [...files].sort((a, b) => {
        const A = a.name;
        const B = b.name;
        return reverse ? (B > A) - (B < A) : (A > B) - (A < B);
    });
}

export function byTime(files, reverse, isFavGroups = false) {
    return [...files].sort((a, b) => {
        const A = getGpxTime({ f: a, reverse, isFavGroups });
        const B = getGpxTime({ f: b, reverse, isFavGroups });
        if (A === B) {
            return az(a.name, b.name);
        }
        return reverse ? B - A : A - B;
    });
}

function byDistance(files, reverse) {
    return [...files].sort((a, b) => {
        const A = a.analysis?.totalDistance ?? a.details?.analysis?.totalDistance ?? 0;
        const B = b.analysis?.totalDistance ?? b.details?.analysis?.totalDistance ?? 0;
        if (A === B) {
            return az(a.name, b.name);
        }
        return reverse ? B - A : A - B;
    });
}

function byCreationTime(files, reverse) {
    return [...files].sort((a, b) => {
        const A = getGpxTime({ f: a, reverse, creationTime: true });
        const B = getGpxTime({ f: b, reverse, creationTime: true });
        if (A === B) {
            return az(a.name, b.name);
        }
        return reverse ? B - A : A - B;
    });
}

function byLocation(files, reverse, markers = null) {
    files = markers ? markers : files;
    return [...files].sort((a, b) => {
        const A = a.locDist ? a.locDist : 0;
        const B = b.locDist ? b.locDist : 0;
        if (A === B) {
            return markers ? az(a.title, b.title) : az(a.name, b.name);
        }
        return reverse ? B - A : A - B;
    });
}

export function doSort({ method, setSortFiles, setSortGroups, markers, files, groups, favoriteGroup }) {
    let res;
    if (setSortFiles) {
        if (method === 'nearest' && markers) {
            setSortFiles(allMethods[method].callback(files, allMethods[method].reverse, markers));
        } else {
            setSortFiles(allMethods[method].callback(files, allMethods[method].reverse));
        }
    }
    if (setSortGroups && (method === 'az' || method === 'za' || favoriteGroup)) {
        if (method === 'time') {
            res = allMethods[method].callback(groups, allMethods[method].reverse, favoriteGroup !== null);
            setSortGroups(res);
        } else {
            res = allMethods[method].callback(groups, allMethods[method].reverse);
            setSortGroups(res);
        }
    }
    return res;
}

export const allMethods = {
    nearest: {
        reverse: false,
        callback: byLocation,
        icon: <NearestIcon />,
        name: 'Nearest',
    },
    time: {
        default: true,
        reverse: true,
        callback: byTime,
        icon: <TimeIcon />,
        name: 'Last modified',
    },
    az: {
        reverse: false,
        callback: byAlpha,
        icon: <AscendingIcon />,
        name: 'Name A - Z',
    },
    za: {
        reverse: true,
        callback: byAlpha,
        icon: <DescendingIcon />,
        name: 'Name Z - A',
    },
    longest: {
        reverse: true,
        callback: byDistance,
        icon: <LongToShortIcon />,
        name: 'Longest distance first',
    },
    shortest: {
        reverse: false,
        callback: byDistance,
        icon: <ShortToLongIcon />,
        name: 'Shortest distance first',
    },
    newDate: {
        reverse: true,
        callback: byCreationTime,
        icon: <NewDateIcon />,
        name: 'Newest date first',
    },
    oldDate: {
        reverse: false,
        callback: byCreationTime,
        icon: <OldDateIcon />,
        name: 'Oldest date first',
    },
};

const defaultMethod = () => {
    for (let l in allMethods) {
        if (allMethods[l].default) {
            return l;
        }
    }
    return Object.keys(allMethods)[0];
};

export function getSelectedSort({ trackGroup = null, favoriteGroup = null, ctx, defaultMethod = null }) {
    if (trackGroup && ctx.selectedSort?.tracks) {
        return ctx.selectedSort.tracks[trackGroup.fullName];
    } else if (favoriteGroup && ctx.selectedSort?.favorites) {
        return ctx.selectedSort.favorites[
            favoriteGroup === DEFAULT_FAV_GROUP_NAME ? DEFAULT_FAV_GROUP_NAME : favoriteGroup.name
        ];
    }
    return defaultMethod;
}

const SortActions = forwardRef(
    (
        {
            trackGroup = null,
            favoriteGroup = null,
            setSortFiles = null,
            setSortGroups = null,
            setOpenSort = null,
            setSortIcon = null,
            setSortName = null,
            markers = null,
        },
        ref
    ) => {
        const ctx = useContext(AppContext);
        const [currentMethod, setCurrentMethod] = useState(
            getSelectedSort({ trackGroup, favoriteGroup, ctx, defaultMethod: defaultMethod() }) || defaultMethod()
        );

        const files = () => {
            if (trackGroup) {
                return trackGroup.groupFiles;
            } else if (favoriteGroup) {
                return ctx.favorites.mapObjs[favoriteGroup.name]?.wpts;
            }
            return null;
        };

        const groups = () => {
            if (trackGroup) {
                return trackGroup.subfolders;
            } else if (favoriteGroup) {
                return ctx.favorites.groups;
            }
            return null;
        };

        useEffect(() => {
            if (currentMethod) {
                doSort({
                    method: currentMethod,
                    setSortFiles,
                    setSortGroups,
                    markers,
                    files: files(),
                    groups: groups(),
                    favoriteGroup,
                });
            }
        }, [files(), currentMethod]);

        const handleChange = (event) => {
            const method = event.target.value;
            doSort({ method, setSortFiles, setSortGroups, markers, files: files(), groups: groups(), favoriteGroup });
            if (setOpenSort) {
                setOpenSort(false);
            }

            setSelectedSort(method);

            if (setSortIcon) {
                setSortIcon(allMethods[method].icon);
            }
            if (setSortName) {
                setSortName(allMethods[method].name);
            }
            setCurrentMethod(method);
        };

        function setSelectedSort(method) {
            if (trackGroup) {
                if (!ctx.selectedSort.tracks) {
                    ctx.selectedSort.tracks = {};
                }
                ctx.selectedSort.tracks[trackGroup.fullName] = method;
            } else if (favoriteGroup) {
                if (!ctx.selectedSort.favorites) {
                    ctx.selectedSort.favorites = {};
                }
                ctx.selectedSort.favorites[
                    favoriteGroup === DEFAULT_FAV_GROUP_NAME ? DEFAULT_FAV_GROUP_NAME : favoriteGroup.name
                ] = method;
            }
            ctx.setSelectedSort({ ...ctx.selectedSort });
        }

        const Label = ({ item }) => {
            return (
                <ListItem className={styles.sortItem}>
                    <Icon className={styles.icon}>{item.icon}</Icon>
                    <ListItemText className={styles.sortText}>{item.name}</ListItemText>
                </ListItem>
            );
        };

        return (
            <Box ref={ref}>
                <Paper className={styles.actions}>
                    <FormControl>
                        <RadioGroup value={currentMethod} onChange={handleChange}>
                            {favoriteGroup && setSortFiles && (
                                <>
                                    <FormControlLabel
                                        className={styles.controlLabel}
                                        disableTypography={true}
                                        labelPlacement="start"
                                        value="nearest"
                                        control={<Radio className={styles.control} size="small" />}
                                        label={<Label item={allMethods.nearest} />}
                                    />
                                    <Divider className={styles.dividerActions} />
                                </>
                            )}
                            <FormControlLabel
                                className={styles.controlLabel}
                                disableTypography={true}
                                labelPlacement="start"
                                value="time"
                                control={<Radio className={styles.control} size="small" />}
                                label={<Label item={allMethods.time} />}
                            />
                            <Divider className={styles.dividerActions} />
                            <FormControlLabel
                                className={styles.controlLabel}
                                disableTypography={true}
                                labelPlacement="start"
                                value="az"
                                control={<Radio className={styles.control} size="small" />}
                                label={<Label item={allMethods.az} />}
                            />
                            <FormControlLabel
                                className={styles.controlLabel}
                                disableTypography={true}
                                labelPlacement="start"
                                value="za"
                                control={<Radio className={styles.control} size="small" />}
                                label={<Label item={allMethods.za} />}
                            />
                            {trackGroup && (
                                <>
                                    <Divider className={styles.dividerActions} />
                                    <FormControlLabel
                                        className={styles.controlLabel}
                                        disableTypography={true}
                                        labelPlacement="start"
                                        value="longest"
                                        control={<Radio className={styles.control} size="small" />}
                                        label={<Label item={allMethods.longest} />}
                                    />
                                    <FormControlLabel
                                        className={styles.controlLabel}
                                        disableTypography={true}
                                        labelPlacement="start"
                                        value="shortest"
                                        control={<Radio className={styles.control} size="small" />}
                                        label={<Label item={allMethods.shortest} />}
                                    />
                                </>
                            )}
                            {favoriteGroup && !setSortFiles && (
                                <>
                                    <Divider className={styles.dividerActions} />
                                    <FormControlLabel
                                        className={styles.controlLabel}
                                        disableTypography={true}
                                        labelPlacement="start"
                                        value="newDate"
                                        control={<Radio className={styles.control} size="small" />}
                                        label={<Label item={allMethods.newDate} />}
                                    />
                                    <FormControlLabel
                                        className={styles.controlLabel}
                                        disableTypography={true}
                                        labelPlacement="start"
                                        value="oldDate"
                                        control={<Radio className={styles.control} size="small" />}
                                        label={<Label item={allMethods.oldDate} />}
                                    />
                                </>
                            )}
                        </RadioGroup>
                    </FormControl>
                </Paper>
            </Box>
        );
    }
);

SortActions.displayName = 'SortActions';
export default SortActions;
