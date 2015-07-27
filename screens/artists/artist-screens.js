import React from 'react-native';
import moment from 'moment';
import api from '../../songkick-api';
import colors from '../../colors';

const {
  StyleSheet,
  NavigatorIOS,
  ListView,
  Text,
  View,
  Image,
  ActivityIndicatorIOS,
  TouchableHighlight,
  ScrollView,
} = React;

const {
  Icon,
} = require('react-native-icons');

const {
  BlurView,
} = require('react-native-blur');

import EventDetails from './event-details';

class ArtistScreen extends React.Component {

  constructor(){
    super();
    this.state = {
      currentArtistID: null
    }
  }

  setCurrentArtistId(currentArtistID) {
    this.setState({
      currentArtistID
    });
  }

  render() {
    return (<NavigatorIOS
      style={styles.navigatorios}
      initialRoute={{
        component: Artists,
        title: 'Your artists',
        passProps: {
          username: this.props.username,
          setCurrentArtistId: this.setCurrentArtistId.bind(this),
        }
      }}
      tintColor={colors.light}
      barTintColor={colors.darker}
      titleTextColor={colors.light}
      translucent={false}
     />)
  }
}

class Artists extends React.Component {

  constructor() {
    super();

    this.state = {
      loaded: false,
      dataSource: new ListView.DataSource({rowHasChanged: (r1, r2) => r1.id !== r2.id }),
      page: 1,
      artists: [],
      hasMore: true
    }
  }
  componentWillMount(){
    this.fetchNextArtists();
  }
  fetchNextArtists() {
    if (!this.state.hasMore || this.state.loadingMore) return;

    this.setState({
      loadingMore: true
    });

    api.getTrackedArtists(this.props.username, this.state.page).then((data) => {
      const newArtists = data.resultsPage.results.artist;
      const artists = this.state.artists.concat(newArtists);
      const totalEntries = data.resultsPage.totalEntries;

      this.setState({
        dataSource: this.state.dataSource.cloneWithRows(artists),
        loaded: true,
        loadingMore: false,
        page: ++this.state.page,
        artists,
        hasMore: artists.length < totalEntries
      });
    })
  }

  renderArtist(artist){
    return <Artist
      artist={artist}
      navigator={this.props.navigator}
      setCurrentArtistId={this.props.setCurrentArtistId}
    />
  }

  renderLoading(){
    return (
      <View style={styles.centering} >
        <ActivityIndicatorIOS color={colors.pink} size="large"/>
      </View>
    );
  }

  render() {
    if (!this.state.loaded) {
      return this.renderLoading();
    }

    return (
      <ListView
        style={styles.artists}
        dataSource={this.state.dataSource}
        renderRow={this.renderArtist.bind(this)}
        onEndReached={this.fetchNextArtists.bind(this)}
      />
    );
  }
}

class Artist extends React.Component {
  artistDetails() {
    this.props.navigator.push({
      title: this.props.artist.displayName,
      backButtonTitle: ' ',
      component: ArtistDetails,
      passProps: this.props,
    });
  }

  render() {
    const {artist} = this.props
    return (
      <TouchableHighlight underlayColor={colors.pink} activeOpacity={0.5} onPress={this.artistDetails.bind(this)}>
        <View style={styles.artist}>
          <Image
            style={styles.thumbnail}
            source={ {uri: `https://images.sk-static.com/images/media/profile_images/artists/${artist.id}/large_avatar`} }
          />
          <Text style={styles.artistText}>{artist.displayName}</Text>
        </View>
      </TouchableHighlight>
    )
  }
}

class ArtistDetails extends React.Component {
  constructor() {
    super();

    this.state = {
      loaded: false,
      page: 1,
      events: [],
      hasMore: true
    }
  }

  componentWillUnmount(){
    this.props.setCurrentArtistId(false);
  }

  componentWillMount(){
    this.props.setCurrentArtistId(this.props.artist.id);
    this.fetchEvents();
  }

  fetchEvents() {
    if (!this.state.hasMore || this.state.loadingMore) return;

    this.setState({
      loadingMore: true
    });

    api.getArtistCalendar(this.props.artist.id).then((data) => {
      const newEvents = data.resultsPage.results.event;

      if (!newEvents) {
        this.setState({
          loaded: true,
          hasMore: false,
          events: []
        });
        return;
      }

      const events = this.state.events.concat(newEvents);
      const totalEntries = data.resultsPage.totalEntries;
      const hasMore = events.length < totalEntries;

      this.setState({
        loaded: true,
        loadingMore: false,
        page: ++this.state.page,
        events,
        hasMore,
      });

      if (hasMore) this.fetchEvents();
    });
  }

  renderEvent(event){
    return <Event
      event={event}
      artist={this.props.artist}
      navigator={this.props.navigator}
      key={event.id}
    />
  }

  renderLoading(){
    const {artist} = this.props
    return (
      <View style={styles.centering} >
        <ActivityIndicatorIOS color={colors.pink} size="large"/>
      </View>
    );
  }

  render() {
    if (!this.state.loaded) {
      return this.renderLoading();
    }

    const {artist} = this.props;
    var msg;

    if (this.state.events && !this.state.events.length) {
      msg = (
        <View style={styles.centering}>
          <Text style={{color: colors.light, fontWeight: 'bold', marginTop: 100}}>No upcoming events</Text>
        </View>
      );
    }

    return (
      <View style={styles.artistDetails}>
        <Image
          style={styles.artistBgImg}
          source={ {uri: `https://images.sk-static.com/images/media/profile_images/artists/${artist.id}/huge_avatar`} }
        >
          <BlurView blurType="dark" style={{flex: 1, backgroundColor: 'transparent',}}>
            <ScrollView style={{flex: 1}}>
              <View style={styles.artistDetailsImgContainer}>
                <Image
                  style={styles.artistDetailsImg}
                  source={{uri: `https://images.sk-static.com/images/media/profile_images/artists/${artist.id}/huge_avatar`}}
                />
              </View>
              {msg}
              {this.state.events.map(this.renderEvent.bind(this))}
            </ScrollView>
          </BlurView>
        </Image>
      </View>
    );
  }
}

class Event extends React.Component {
  eventDetails() {
    this.props.navigator.push({
      title: this.props.artist.displayName,
      component: EventDetails,
      backButtonTitle: ' ',
      passProps: this.props
    });
  }

  removeDateFromEventName(name) {
    const index = name.indexOf(' (');
    if(index !== -1){
      return name.substring(0, index);
    } else {
      return name;
    }
  }

  renderDate(date) {
    const d = moment(date);
    return (
      <View style={styles.eventDate}>
        <Text style={styles.eventDateDay}>{d.format('DD MMM')}</Text>
        <Text style={styles.eventDateYear}>{d.format('YYYY')}</Text>
      </View>
    );
  }

  renderEventNameAndLocation(event) {
    const name = this.removeDateFromEventName(event.displayName);
    const {city} = event.location;
    return (
      <View style={styles.eventName}>
        <Text style={styles.eventText}>{name}</Text>
        <Text style={styles.eventLocation}>{city}</Text>
      </View>
    );
  }

  render() {
    const {event} = this.props
    return (
      <TouchableHighlight underlayColor={colors.pink} onPress={this.eventDetails.bind(this)}>
        <View style={styles.event}>
          {this.renderDate(event.start.date)}
          {this.renderEventNameAndLocation.bind(this)(event)}
          <Icon
            name='fontawesome|angle-right'
            size={30}
            color='#ffffff'
            style={styles.arrow}
          />
        </View>
      </TouchableHighlight>
    );
  }
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  thumbnail: {
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 10,
    marginRight: 10,
    width: 50,
    height: 50,
    borderRadius: 20,
  },
  artistBgImg: {
    flex: 1,
    resizeMode: 'cover',
  },
  artistDetailsImgContainer: {
    height: 200,
  },
  artistDetailsImg: {
    height: 200,
    resizeMode: 'cover',
  },
  artists: {
    backgroundColor: colors.dark,

  },
  artist: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  event:{
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 10,
    paddingRight: 10,
  },
  eventName:{
    width: 275,
  },
  eventText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: colors.light,
  },
  eventLocation: {
    fontSize: 10,
    color: '#dedede',
  },
  eventDate: {
    width: 60,
  },
  eventDateDay: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#ffffff',
  },
  eventDateYear: {
    fontSize: 13,
    color: '#dedede',
  },
  arrow: {
    width: 30,
    height: 30,
    paddingLeft: 10,
    paddingRight: 15,
    right: 0,
  },
  artistText: {
    flex: 1,
    fontSize: 16,
    color: colors.light
  },
  artistDetails: {
    flex: 1,
    paddingBottom: 108,
  },
  navigatorios: {
    flex: 1,
  },
  centering: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
});

export default ArtistScreen;