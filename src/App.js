import React from "react";
import { api } from './api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Header from "./components/Header";
import Footer from "./components/Footer";
import Items from "./components/Items";
import Categories from "./components/Categories";
import ShowFullItem from "./components/ShowFullItem";
import Checkout from "./components/Checkout";
import UserData from "./components/UserData";
import OrderHistory from "./components/OrderHistory";
import AboutUs from './components/AboutUs';
import './index.css';


class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      orders: [],
      currentItems: [],
      items: [],
      showFullItem: false,
      fullItem: {},
      showCheckout: false,
      catalogError: '',
    };

    this.addToOrder = this.addToOrder.bind(this);
    this.deleteOrder = this.deleteOrder.bind(this);
    this.chooseCategory = this.chooseCategory.bind(this);
    this.onShowItem = this.onShowItem.bind(this);
    this.onCheckout = this.onCheckout.bind(this);
    this.onBack = this.onBack.bind(this);
    this.handleOrderConfirmed = this.handleOrderConfirmed.bind(this);
  }

  componentDidMount() {
    api('/products')
      .then((items) => this.setState({ items, currentItems: items }))
      .catch((error) => this.setState({ catalogError: error.message }));
  }

  handleOrderConfirmed() {
    this.setState({ orders: [], showCheckout: false });
    toast.success('Order placed successfully!', {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  }

  render() {
    if (this.state.showCheckout) {
      return (
        <>
          <Checkout
            orders={this.state.orders}
            onBack={this.onBack}
            onOrderConfirmed={this.handleOrderConfirmed}
          />
          <ToastContainer />
        </>
      );
    }

    return (
      <Router>
        <Switch>
          <Route path="/user-data" component={UserData} />
          <Route path="/order-history" component={OrderHistory} />
          <Route path="/about" component={AboutUs} />
          <Route path="/">
            <div className="wrapper">
              <Header orders={this.state.orders} onDelete={this.deleteOrder} onCheckout={this.onCheckout} />
              <Categories chooseCategory={this.chooseCategory} />
              {this.state.catalogError && <p role="alert">Could not load products: {this.state.catalogError}</p>}
              <Items onShowItem={this.onShowItem} items={this.state.currentItems} onAdd={this.addToOrder} />
              {this.state.showFullItem && <ShowFullItem onAdd={this.addToOrder} onShowItem={this.onShowItem} item={this.state.fullItem} />}
              <Footer />
              <ToastContainer />
            </div>
          </Route>
        </Switch>
      </Router>
    );
  }

  onShowItem(item) {
    this.setState({ fullItem: item });
    this.setState({ showFullItem: !this.state.showFullItem });
  }

  chooseCategory(category) {
    if (category === "all") {
      this.setState({ currentItems: this.state.items });
      return;
    }
    this.setState({
      currentItems: this.state.items.filter((el) => el.category === category),
    });
  }

  deleteOrder(id) {
    let updatedOrders = this.state.orders.map((order) => {
      if (order.item.id === id) {
        if (order.quantity > 1) {
          return { ...order, quantity: order.quantity - 1 };
        }
        return null;
      }
      return order;
    }).filter(order => order !== null);

    this.setState({ orders: updatedOrders });
  }

  addToOrder(item) {
    let isInArray = false;
    let updatedOrders = this.state.orders.map((order) => {
      if (order.item.id === item.id) {
        isInArray = true;
        return { ...order, quantity: order.quantity + 1 };
      }
      return order;
    });

    if (!isInArray) {
      updatedOrders = [...this.state.orders, { item, quantity: 1 }];
    }

    this.setState({ orders: updatedOrders });
  }

  onCheckout() {
    this.setState({ showCheckout: true });
  }

  onBack() {
    this.setState({ showCheckout: false });
  }
}

export default App;
