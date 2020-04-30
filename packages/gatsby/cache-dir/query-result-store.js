import React from "react"
import { StaticQueryContext } from "gatsby"
import {
  getPageQueryData,
  registerPath as socketRegisterPath,
  unregisterPath as socketUnregisterPath,
  getStaticQueryData,
} from "./socketIo"
import PageRenderer from "./page-renderer"
import normalizePagePath from "./normalize-page-path"

if (process.env.NODE_ENV === `production`) {
  throw new Error(
    `It appears like Gatsby is misconfigured. JSONStore is Gatsby internal ` +
      `development-only component and should never be used in production.\n\n` +
      `Unless your site has a complex or custom webpack/Gatsby ` +
      `configuration this is likely a bug in Gatsby. ` +
      `Please report this at https://github.com/gatsbyjs/gatsby/issues ` +
      `with steps to reproduce this error.`
  )
}

const getPathFromProps = props =>
  props.pageResources && props.pageResources.page
    ? normalizePagePath(props.pageResources.page.path)
    : undefined

export class PageQueryStore extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      pageQueryData: getPageQueryData(),
      path: null,
    }
  }

  handleMittEvent = () => {
    this.setState({
      pageQueryData: getPageQueryData(),
    })
  }

  componentDidMount() {
    socketRegisterPath(getPathFromProps(this.props))
    ___emitter.on(`*`, this.handleMittEvent)
  }

  componentWillUnmount() {
    socketUnregisterPath(this.state.path)
    ___emitter.off(`*`, this.handleMittEvent)
  }

  static getDerivedStateFromProps(props, state) {
    const newPath = getPathFromProps(props)
    if (newPath !== state.path) {
      socketUnregisterPath(state.path)
      socketRegisterPath(newPath)
      return {
        path: newPath,
      }
    }

    return null
  }

  shouldComponentUpdate(nextProps, nextState) {
    // We want to update this component when:
    // - location changed
    // - page data for path changed

    return (
      this.props.location !== nextProps.location ||
      this.state.path !== nextState.path ||
      this.state.pageQueryData[normalizePagePath(nextState.path)] !==
        nextState.pageQueryData[normalizePagePath(nextState.path)]
    )
  }

  // would be nice to not have to write this code ourselves..
  getParams() {
    const parts = /:[a-z]+/g.exec(this.props.path) || []
    const params = {}

    // only supports keys that are [adjfiasjf].js (which by now is translated into :asdfajsdif)
    parts.forEach(colonPart => {
      // strips off the starting `:` in something like `:id`
      const [, ...part] = colonPart
      params[part] = this.props[part]
    })

    return { ...params, ...this.props.pageResources.json.pageContext.__params }
  }

  render() {
    let data = this.state.pageQueryData[getPathFromProps(this.props)]

    // eslint-disable-next-line
    if (!data) {
      return <div />
    }

    // This might be a bug, it might highjack the data key from query components.
    // But I don't think they should both exist in a single component.
    const __collectionData = this.props.pageResources.json.pageContext
      .__collectionData
    const collectionData = __collectionData ? { data: __collectionData } : {}

    const params = this.getParams()

    return (
      <PageRenderer
        {...this.props}
        {...data}
        {...collectionData}
        params={params}
      />
    )
  }
}

export class StaticQueryStore extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      staticQueryData: getStaticQueryData(),
    }
  }

  handleMittEvent = () => {
    this.setState({
      staticQueryData: getStaticQueryData(),
    })
  }

  componentDidMount() {
    ___emitter.on(`*`, this.handleMittEvent)
  }

  componentWillUnmount() {
    ___emitter.off(`*`, this.handleMittEvent)
  }

  shouldComponentUpdate(nextProps, nextState) {
    // We want to update this component when:
    // - static query results changed

    return this.state.staticQueryData !== nextState.staticQueryData
  }

  render() {
    return (
      <StaticQueryContext.Provider value={this.state.staticQueryData}>
        {this.props.children}
      </StaticQueryContext.Provider>
    )
  }
}
